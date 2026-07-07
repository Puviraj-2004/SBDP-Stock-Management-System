"use server";

import { Prisma, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refreshInvoicePaidStatus, getInvoicePaidAmount, paymentCountsTowardBalance } from "@/lib/balance";
import { dateInputToDate, startOfToday } from "@/lib/dates";
import {
  batchSchema,
  invoiceSchema,
  paymentSchema,
  productSchema,
  shopSchema,
  supplierSchema,
  tripItemSchema,
  tripSchema,
  vehicleSchema
} from "@/lib/validations";

type ActionState = { ok?: boolean; message?: string };

function getInvoiceItemsFromForm(formData: FormData) {
  const rows = Array.from(formData.entries())
    .map(([key]) => {
      const match = key.match(/^product-(\d+)$/);
      if (!match) return null;

      const index = match[1];
      return {
        index: Number(index),
        productId: String(formData.get(`product-${index}`) ?? ""),
        quantity: Number(formData.get(`quantity-${index}`) ?? 0)
      };
    })
    .filter((row): row is { index: number; productId: string; quantity: number } => Boolean(row))
    .sort((a, b) => a.index - b.index)
    .map(({ productId, quantity }) => ({ productId, quantity }))
    .filter((row) => row.productId && row.quantity > 0);

  return rows;
}

async function assertInvoiceProductsBelongToTrip(tripId: string | null, productIds: string[]) {
  if (!tripId) return;

  const tripItems = await prisma.loadingTripItem.findMany({
    where: { tripId },
    select: { batch: { select: { productId: true } } }
  });
  const loadedProductIds = new Set(tripItems.map((item) => item.batch.productId));
  const hasOutsideProduct = productIds.some((productId) => !loadedProductIds.has(productId));

  if (hasOutsideProduct) {
    throw new Error("Invoice contains products that were not loaded on the linked trip");
  }
}

async function getInvoiceUnallocatedAmount(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      totalAmount: true,
      allocations: { select: { amount: true } }
    }
  });
  if (!invoice) return 0;

  const allocated = invoice.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
  return Math.max(0, Number(invoice.totalAmount) - allocated);
}

async function allocateAmountToInvoice(
  tx: Prisma.TransactionClient,
  paymentId: string,
  invoiceId: string,
  availableAmount: number
) {
  if (availableAmount <= 0) return 0;

  const remainingInvoiceAmount = await getInvoiceUnallocatedAmount(tx, invoiceId);
  const allocationAmount = Math.min(availableAmount, remainingInvoiceAmount);
  if (allocationAmount <= 0) return 0;

  await tx.paymentAllocation.create({
    data: {
      paymentId,
      invoiceId,
      amount: new Prisma.Decimal(allocationAmount)
    }
  });

  return allocationAmount;
}

async function reallocatePayment(
  tx: Prisma.TransactionClient,
  paymentId: string,
  preferredInvoiceId?: string | null,
  selectedInvoiceIds: string[] = []
) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: { allocations: true }
  });
  if (!payment) throw new Error("Payment not found");

  const affectedInvoiceIds = new Set(payment.allocations.map((allocation) => allocation.invoiceId));
  await tx.paymentAllocation.deleteMany({ where: { paymentId } });

  if (!paymentCountsTowardBalance(payment)) {
    return affectedInvoiceIds;
  }

  let remainingPaymentAmount = Number(payment.amount);

  if (preferredInvoiceId) {
    const preferredInvoice = await tx.invoice.findUnique({
      where: { id: preferredInvoiceId },
      select: { id: true, shopId: true }
    });
    if (preferredInvoice && preferredInvoice.shopId === payment.shopId) {
      const allocated = await allocateAmountToInvoice(tx, payment.id, preferredInvoice.id, remainingPaymentAmount);
      remainingPaymentAmount -= allocated;
      affectedInvoiceIds.add(preferredInvoice.id);
    }
  }

  for (const invoiceId of selectedInvoiceIds) {
    if (remainingPaymentAmount <= 0) break;
    if (invoiceId === preferredInvoiceId) continue;

    const selectedInvoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, shopId: true }
    });
    if (!selectedInvoice || selectedInvoice.shopId !== payment.shopId) continue;

    const allocated = await allocateAmountToInvoice(tx, payment.id, selectedInvoice.id, remainingPaymentAmount);
    if (allocated > 0) {
      remainingPaymentAmount -= allocated;
      affectedInvoiceIds.add(selectedInvoice.id);
    }
  }

  if (remainingPaymentAmount > 0) {
    const invoices = await tx.invoice.findMany({
      where: { shopId: payment.shopId },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      select: { id: true }
    });

    for (const invoice of invoices) {
      if (invoice.id === preferredInvoiceId) continue;
      if (selectedInvoiceIds.includes(invoice.id)) continue;
      const allocated = await allocateAmountToInvoice(tx, payment.id, invoice.id, remainingPaymentAmount);
      if (allocated > 0) {
        remainingPaymentAmount -= allocated;
        affectedInvoiceIds.add(invoice.id);
      }
      if (remainingPaymentAmount <= 0) break;
    }
  }

  return affectedInvoiceIds;
}

async function refreshInvoices(invoiceIds: Iterable<string>) {
  for (const invoiceId of new Set(invoiceIds)) {
    await refreshInvoicePaidStatus(invoiceId);
  }
}

function getSelectedInvoiceIds(formData: FormData) {
  return formData
    .getAll("allocateInvoiceId")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function loginAction(formData: FormData) {
  const ok = await login(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""));
  if (!ok) redirect("/login?error=1");
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function updateOwnerAction(formData: FormData) {
  const id = String(formData.get("id"));
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username) throw new Error("Username is required");

  await prisma.owner.update({
    where: { id },
    data: {
      username,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
    }
  });
  revalidatePath("/account");
}

export async function productScanAction(formData: FormData) {
  const code = String(formData.get("q") ?? formData.get("scan") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim();

  if (!code) redirect("/products");

  const matches = await prisma.product.findMany({
    where: {
      ...(supplierId ? { supplierId } : {}),
      OR: [{ barcode: code }, { itemCode: code }]
    },
    select: { id: true },
    take: 2
  });

  if (matches.length === 1) {
    redirect(`/products/${matches[0].id}`);
  }

  if (matches.length > 1) {
    redirect(`/products?q=${encodeURIComponent(code)}`);
  }

  redirect(`/products/new?code=${encodeURIComponent(code)}`);
}

export async function createSupplierAction(formData: FormData) {
  const data = supplierSchema.parse(Object.fromEntries(formData));
  await prisma.supplier.create({ data });
  revalidatePath("/suppliers");
}

export async function updateSupplierAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = supplierSchema.parse(Object.fromEntries(formData));
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}`);
}

export async function deleteSupplierAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function createVehicleAction(formData: FormData) {
  const data = vehicleSchema.parse(Object.fromEntries(formData));
  await prisma.vehicle.create({ data });
  revalidatePath("/vehicles");
}

export async function updateVehicleAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = vehicleSchema.parse(Object.fromEntries(formData));
  await prisma.vehicle.update({ where: { id }, data });
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function deleteVehicleAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/vehicles");
}

export async function createShopAction(formData: FormData) {
  const data = shopSchema.parse(Object.fromEntries(formData));
  const shop = await prisma.shop.create({ data });
  revalidatePath("/shops");
  redirect(`/shops/${shop.id}`);
}

export async function updateShopAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = shopSchema.parse(Object.fromEntries(formData));
  await prisma.shop.update({ where: { id }, data });
  revalidatePath("/shops");
  revalidatePath(`/shops/${id}`);
  redirect(`/shops/${id}`);
}

export async function deleteShopAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.shop.delete({ where: { id } });
  revalidatePath("/shops");
  redirect("/shops");
}

export async function createProductAction(formData: FormData) {
  const data = productSchema.parse(Object.fromEntries(formData));
  const product = await prisma.product.create({
    data: { ...data, sellingPrice: new Prisma.Decimal(data.sellingPrice) }
  });
  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProductAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = productSchema.parse(Object.fromEntries(formData));
  await prisma.product.update({
    where: { id },
    data: { ...data, sellingPrice: new Prisma.Decimal(data.sellingPrice) }
  });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  redirect("/products");
}

export async function receiveBatchAction(formData: FormData) {
  const data = batchSchema.parse(Object.fromEntries(formData));
  await prisma.productBatch.create({
    data: {
      productId: data.productId,
      quantity: data.quantity,
      expiryDate: dateInputToDate(data.expiryDate),
      receivedDate: dateInputToDate(data.receivedDate)
    }
  });
  revalidatePath("/stock/receive");
  revalidatePath(`/products/${data.productId}`);
}

export async function updateBatchAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = batchSchema.parse(Object.fromEntries(formData));
  const batch = await prisma.productBatch.update({
    where: { id },
    data: {
      productId: data.productId,
      quantity: data.quantity,
      expiryDate: dateInputToDate(data.expiryDate),
      receivedDate: dateInputToDate(data.receivedDate)
    }
  });
  revalidatePath("/stock");
  revalidatePath(`/products/${batch.productId}`);
  redirect("/stock");
}

export async function deleteBatchAction(formData: FormData) {
  const id = String(formData.get("id"));
  const batch = await prisma.productBatch.delete({ where: { id } });
  revalidatePath("/stock");
  revalidatePath(`/products/${batch.productId}`);
  redirect("/stock");
}

export async function createTripAction(formData: FormData) {
  const data = tripSchema.parse(Object.fromEntries(formData));
  const trip = await prisma.loadingTrip.create({
    data: {
      vehicleId: data.vehicleId,
      supplierId: data.supplierId,
      tripDate: dateInputToDate(data.tripDate)
    }
  });
  redirect(`/trips/${trip.id}`);
}

export async function updateTripAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = tripSchema.parse(Object.fromEntries(formData));
  await prisma.loadingTrip.update({
    where: { id },
    data: {
      vehicleId: data.vehicleId,
      supplierId: data.supplierId,
      tripDate: dateInputToDate(data.tripDate)
    }
  });
  revalidatePath("/trips");
  revalidatePath(`/trips/${id}`);
  redirect(`/trips/${id}`);
}

export async function addTripItemAction(formData: FormData) {
  const data = tripItemSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const trip = await tx.loadingTrip.findUnique({ where: { id: data.tripId } });
    if (!trip || trip.status !== "loaded") throw new Error("Trip is not open for loading");

    const batch = await tx.productBatch.findUnique({
      where: { id: data.batchId },
      include: { product: { select: { supplierId: true } } }
    });
    if (!batch || batch.quantity < data.quantityLoaded) throw new Error("Not enough stock in selected batch");
    if (trip.supplierId && batch.product.supplierId !== trip.supplierId) {
      throw new Error("Selected batch does not belong to this trip supplier");
    }

    await tx.productBatch.update({
      where: { id: data.batchId },
      data: { quantity: { decrement: data.quantityLoaded } }
    });
    await tx.loadingTripItem.create({
      data: {
        tripId: data.tripId,
        batchId: data.batchId,
        quantityLoaded: data.quantityLoaded
      }
    });
  });
  revalidatePath(`/trips/${data.tripId}`);
}

export async function addTripItemFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await addTripItemAction(formData);
    return { ok: true, message: "Trip item added." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to add trip item."
    };
  }
}

export async function updateTripItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const quantityLoaded = Number(formData.get("quantityLoaded"));
  if (!Number.isInteger(quantityLoaded) || quantityLoaded <= 0) throw new Error("Quantity must be positive");

  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.loadingTripItem.findUnique({
      where: { id },
      include: { trip: true, batch: true }
    });
    if (!current || current.trip.status !== "loaded") throw new Error("Trip item is not editable");

    const delta = quantityLoaded - current.quantityLoaded;
    if (delta > 0 && current.batch.quantity < delta) throw new Error("Not enough stock in selected batch");
    if (delta !== 0) {
      await tx.productBatch.update({
        where: { id: current.batchId },
        data: { quantity: delta > 0 ? { decrement: delta } : { increment: Math.abs(delta) } }
      });
    }

    return tx.loadingTripItem.update({
      where: { id },
      data: { quantityLoaded }
    });
  });
  revalidatePath(`/trips/${item.tripId}`);
}

export async function removeTripItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const item = await prisma.$transaction(async (tx) => {
    const current = await tx.loadingTripItem.findUnique({ where: { id }, include: { trip: true } });
    if (!current || current.trip.status !== "loaded") throw new Error("Trip item is not removable");
    await tx.productBatch.update({
      where: { id: current.batchId },
      data: { quantity: { increment: current.quantityLoaded } }
    });
    await tx.loadingTripItem.delete({ where: { id } });
    return current;
  });
  revalidatePath(`/trips/${item.tripId}`);
}

export async function cancelOpenTripAction(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const trip = await tx.loadingTrip.findUnique({
      where: { id },
      include: { items: true, invoices: true }
    });
    if (!trip || trip.status !== "loaded" || trip.invoices.length > 0) {
      throw new Error("Only open trips without invoices can be cancelled");
    }

    for (const item of trip.items) {
      await tx.productBatch.update({
        where: { id: item.batchId },
        data: { quantity: { increment: item.quantityLoaded } }
      });
    }
    await tx.loadingTrip.delete({ where: { id } });
  });
  revalidatePath("/trips");
  redirect("/trips");
}

export async function closeTripAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const items = await prisma.loadingTripItem.findMany({ where: { tripId } });
  await prisma.$transaction(async (tx) => {
    const trip = await tx.loadingTrip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== "loaded") throw new Error("Trip is not open");

    for (const item of items) {
      const rawQuantityReturned = formData.get(`returned-${item.id}`);
      if (rawQuantityReturned === null || String(rawQuantityReturned).trim() === "") {
        throw new Error("Returned quantity is required for every loaded item");
      }

      const quantityReturned = Number(rawQuantityReturned);
      if (!Number.isInteger(quantityReturned) || quantityReturned < 0 || quantityReturned > item.quantityLoaded) {
        throw new Error("Returned quantity cannot exceed loaded quantity");
      }
      await tx.loadingTripItem.update({
        where: { id: item.id },
        data: { quantityReturned }
      });
      if (quantityReturned > 0) {
        await tx.productBatch.update({
          where: { id: item.batchId },
          data: { quantity: { increment: quantityReturned } }
        });
      }
    }

    await tx.loadingTrip.update({
      where: { id: tripId },
      data: { status: "closed", closedAt: new Date() }
    });
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function createInvoiceAction(formData: FormData) {
  const data = invoiceSchema.parse({
    shopId: String(formData.get("shopId") ?? ""),
    tripId: String(formData.get("tripId") ?? ""),
    invoiceDate: String(formData.get("invoiceDate") ?? ""),
    items: getInvoiceItemsFromForm(formData)
  });

  const productIds = [...new Set(data.items.map((row) => row.productId))];
  await assertInvoiceProductsBelongToTrip(data.tripId, productIds);

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw new Error("Invoice contains an unknown product");
  const priceByProduct = new Map(products.map((product) => [product.id, product.sellingPrice]));
  const total = data.items.reduce((sum, row) => sum + row.quantity * Number(priceByProduct.get(row.productId) ?? 0), 0);

  const invoice = await prisma.invoice.create({
    data: {
      shopId: data.shopId,
      tripId: data.tripId,
      invoiceDate: dateInputToDate(data.invoiceDate),
      totalAmount: new Prisma.Decimal(total),
      items: {
        create: data.items.map((row) => {
          const unitPrice = priceByProduct.get(row.productId) ?? new Prisma.Decimal(0);
          return {
            productId: row.productId,
            quantity: row.quantity,
            unitPrice,
            lineTotal: new Prisma.Decimal(row.quantity * Number(unitPrice))
          };
        })
      }
    }
  });

  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId"));
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, allocations: true }
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.payments.length > 0 || invoice.allocations.length > 0) throw new Error("Invoices with payments cannot be edited");

  const data = invoiceSchema.parse({
    shopId: String(formData.get("shopId") ?? ""),
    tripId: String(formData.get("tripId") ?? ""),
    invoiceDate: String(formData.get("invoiceDate") ?? ""),
    items: getInvoiceItemsFromForm(formData)
  });

  const productIds = [...new Set(data.items.map((row) => row.productId))];
  await assertInvoiceProductsBelongToTrip(data.tripId, productIds);

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw new Error("Invoice contains an unknown product");
  const priceByProduct = new Map(products.map((product) => [product.id, product.sellingPrice]));
  const total = data.items.reduce((sum, row) => sum + row.quantity * Number(priceByProduct.get(row.productId) ?? 0), 0);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        shopId: data.shopId,
        tripId: data.tripId,
        invoiceDate: dateInputToDate(data.invoiceDate),
        totalAmount: new Prisma.Decimal(total),
        paidStatus: "unpaid",
        items: {
          create: data.items.map((row) => {
            const unitPrice = priceByProduct.get(row.productId) ?? new Prisma.Decimal(0);
            return {
              productId: row.productId,
              quantity: row.quantity,
              unitPrice,
              lineTotal: new Prisma.Decimal(row.quantity * Number(unitPrice))
            };
          })
        }
      }
    });
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/shops/${invoice.shopId}`);
  if (data.shopId !== invoice.shopId) revalidatePath(`/shops/${data.shopId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId"));
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, allocations: true }
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.payments.length > 0 || invoice.allocations.length > 0) throw new Error("Invoices with payments cannot be deleted");
  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/reports");
  revalidatePath(`/shops/${invoice.shopId}`);
  redirect(`/shops/${invoice.shopId}`);
}

export async function createPaymentAction(formData: FormData) {
  const data = paymentSchema.parse(Object.fromEntries(formData));
  const selectedInvoiceIds = getSelectedInvoiceIds(formData);
  const affectedInvoiceIds = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        shopId: data.shopId,
        invoiceId: data.invoiceId,
        paymentDate: dateInputToDate(data.paymentDate),
        amount: new Prisma.Decimal(data.amount),
        method: data.method as PaymentMethod,
        chequeNumber: data.method === "cheque" ? data.chequeNumber : null,
        chequeStatus: data.method === "cheque" ? data.chequeStatus ?? "pending" : null,
        notes: data.notes
      }
    });

    return reallocatePayment(tx, payment.id, data.invoiceId, selectedInvoiceIds);
  });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${data.shopId}`);
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function updatePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const existing = await prisma.payment.findUnique({ where: { id }, include: { allocations: true } });
  if (!existing) throw new Error("Payment not found");
  const data = paymentSchema.parse({
    ...Object.fromEntries(formData),
    shopId: existing.shopId,
    invoiceId: existing.invoiceId
  });
  const affectedInvoiceIds = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: {
        paymentDate: dateInputToDate(data.paymentDate),
        amount: new Prisma.Decimal(data.amount),
        method: data.method as PaymentMethod,
        chequeNumber: data.method === "cheque" ? data.chequeNumber : null,
        chequeStatus: data.method === "cheque" ? data.chequeStatus ?? "pending" : null,
        notes: data.notes
      }
    });

    return reallocatePayment(tx, id, existing.invoiceId);
  });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${existing.shopId}`);
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function deletePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const existing = await prisma.payment.findUnique({ where: { id }, include: { allocations: true } });
  if (!existing) throw new Error("Payment not found");
  const affectedInvoiceIds = existing.allocations.map((allocation) => allocation.invoiceId);
  const payment = await prisma.payment.delete({ where: { id } });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${payment.shopId}`);
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function clearChequeAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) throw new Error("Payment not found");
  const affectedInvoiceIds = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: { chequeStatus: "cleared" }
    });

    return reallocatePayment(tx, id, existing.invoiceId);
  });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${existing.shopId}`);
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function markInvoicePaidAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId"));
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");

  const paid = await getInvoicePaidAmount(invoiceId);
  const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
  if (remaining > 0) {
    const affectedInvoiceIds = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          shopId: invoice.shopId,
          invoiceId,
          amount: new Prisma.Decimal(remaining),
          method: "cash",
          paymentDate: startOfToday()
        }
      });

      return reallocatePayment(tx, payment.id, invoiceId);
    });
    await refreshInvoices(affectedInvoiceIds);
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/shops/${invoice.shopId}`);
}
