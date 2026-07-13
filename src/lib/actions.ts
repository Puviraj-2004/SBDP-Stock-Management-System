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
  openingInvoiceSchema,
  paymentSchema,
  productSchema,
  shopSchema,
  supplierSchema,
  vehicleLoadSchema,
  vehicleReturnSchema,
  vehicleSchema
} from "@/lib/validations";

type ActionState = { ok?: boolean; message?: string };

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function isRedirectError(error: unknown) {
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String((error as { digest?: unknown }).digest ?? "")
    : "";
  return digest.startsWith("NEXT_REDIRECT");
}

async function runActionWithInlineError(
  action: (formData: FormData) => Promise<void>,
  formData: FormData,
  fallback: string
): Promise<ActionState> {
  try {
    await action(formData);
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { ok: false, message: getActionErrorMessage(error, fallback) };
  }
}

function getInvoiceItemsFromForm(formData: FormData) {
  const rows = Array.from(formData.entries())
    .map(([key]) => {
      const match = key.match(/^batch-(\d+)$/);
      if (!match) return null;

      const index = match[1];
      return {
        index: Number(index),
        batchId: String(formData.get(`batch-${index}`) ?? ""),
        quantity: Number(formData.get(`quantity-${index}`) ?? 0)
      };
    })
    .filter((row): row is { index: number; batchId: string; quantity: number } => Boolean(row))
    .sort((a, b) => a.index - b.index)
    .map(({ batchId, quantity }) => ({ batchId, quantity }))
    .filter((row) => row.batchId && row.quantity > 0);

  return rows;
}

function getReturnItemsFromForm(formData: FormData) {
  const rows = Array.from(formData.entries())
    .map(([key]) => {
      const match = key.match(/^batch-(\d+)$/);
      if (!match) return null;

      const index = match[1];
      return {
        index: Number(index),
        batchId: String(formData.get(`batch-${index}`) ?? ""),
        quantityReturned: Number(formData.get(`quantity-${index}`) ?? 0)
      };
    })
    .filter((row): row is { index: number; batchId: string; quantityReturned: number } => Boolean(row))
    .sort((a, b) => a.index - b.index)
    .map(({ batchId, quantityReturned }) => ({ batchId, quantityReturned }))
    .filter((row) => row.batchId && row.quantityReturned > 0);

  return rows;
}

async function getVehicleBatchBalances(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  batchIds: string[],
  asOfDate: Date
) {
  const rows = await tx.vehicleStockLedger.groupBy({
    by: ["batchId"],
    where: {
      vehicleId,
      batchId: { in: batchIds },
      transactionDate: { lte: asOfDate }
    },
    _sum: { quantityChange: true }
  });

  return new Map(rows.map((row) => [row.batchId, row._sum.quantityChange ?? 0]));
}

function applyWarehouseMovement(balance: number, movement: { transactionType: string; quantityChange: number }) {
  if (movement.transactionType === "load") return balance - movement.quantityChange;
  if (movement.transactionType === "return_to_warehouse") return balance + Math.abs(movement.quantityChange);
  return balance;
}

async function getSafeWarehouseAvailableFromDate(
  tx: Prisma.TransactionClient,
  batchId: string,
  fromDate: Date
) {
  const batch = await tx.productBatch.findUnique({
    where: { id: batchId },
    select: { receivedQuantity: true }
  });
  if (!batch) return 0;

  const movements = await tx.vehicleStockLedger.findMany({
    where: {
      batchId,
      transactionType: { in: ["load", "return_to_warehouse"] }
    },
    select: { transactionType: true, quantityChange: true, transactionDate: true },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }]
  });

  let balance = batch.receivedQuantity;
  for (const movement of movements.filter((entry) => entry.transactionDate < fromDate)) {
    balance = applyWarehouseMovement(balance, movement);
  }

  let minimumBalance = balance;
  for (const movement of movements.filter((entry) => entry.transactionDate >= fromDate)) {
    balance = applyWarehouseMovement(balance, movement);
    minimumBalance = Math.min(minimumBalance, balance);
  }

  return Math.max(0, minimumBalance);
}

async function getSafeVehicleBatchAvailableFromDate(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  batchId: string,
  fromDate: Date
) {
  const movements = await tx.vehicleStockLedger.findMany({
    where: { vehicleId, batchId },
    select: { quantityChange: true, transactionDate: true },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }]
  });

  let balance = 0;
  for (const movement of movements.filter((entry) => entry.transactionDate < fromDate)) {
    balance += movement.quantityChange;
  }

  let minimumBalance = balance;
  for (const movement of movements.filter((entry) => entry.transactionDate >= fromDate)) {
    balance += movement.quantityChange;
    minimumBalance = Math.min(minimumBalance, balance);
  }

  return Math.max(0, minimumBalance);
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
  const previousAllocationInvoiceIds = payment.allocations.map((allocation) => allocation.invoiceId);
  await tx.paymentAllocation.deleteMany({ where: { paymentId } });

  if (!paymentCountsTowardBalance(payment)) {
    if (payment.invoiceId) affectedInvoiceIds.add(payment.invoiceId);
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

  const priorityInvoiceIds = selectedInvoiceIds.length > 0 ? selectedInvoiceIds : previousAllocationInvoiceIds;

  for (const invoiceId of priorityInvoiceIds) {
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

function getManualPaymentAllocations(formData: FormData) {
  return getSelectedInvoiceIds(formData)
    .map((invoiceId) => ({
      invoiceId,
      amount: Number(formData.get(`allocationAmount-${invoiceId}`) ?? 0)
    }))
    .filter((allocation) => allocation.invoiceId && allocation.amount > 0);
}

function getSafeRedirectPath(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "");
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) return fallback;
  return redirectTo;
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

  redirect(`/products?q=${encodeURIComponent(code)}`);
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
  return { id: shop.id };
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
    data: {
      supplierId: data.supplierId,
      name: data.name,
      measurement: data.measurement,
      barcode: data.barcode,
      itemCode: data.itemCode,
      sellingPrice: new Prisma.Decimal(data.sellingPrice),
      mrp: data.mrp === null ? null : new Prisma.Decimal(data.mrp)
    }
  });
  revalidatePath("/products");
  return { id: product.id };
}

export async function updateProductAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = productSchema.parse(Object.fromEntries(formData));
  await prisma.product.update({
    where: { id },
    data: {
      supplierId: data.supplierId,
      name: data.name,
      measurement: data.measurement,
      barcode: data.barcode,
      itemCode: data.itemCode,
      sellingPrice: new Prisma.Decimal(data.sellingPrice),
      mrp: data.mrp === null ? null : new Prisma.Decimal(data.mrp)
    }
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
      receivedQuantity: data.receivedQuantity,
      costPrice: new Prisma.Decimal(data.costPrice),
      expiryDate: dateInputToDate(data.expiryDate),
      receivedDate: dateInputToDate(data.receivedDate)
    }
  });
  revalidatePath("/stock");
  revalidatePath(`/products/${data.productId}`);
  redirect("/stock");
}

export async function updateBatchAction(formData: FormData) {
  const id = String(formData.get("id"));
  const data = batchSchema.parse(Object.fromEntries(formData));
  const batch = await prisma.productBatch.update({
    where: { id },
    data: {
      productId: data.productId,
      receivedQuantity: data.receivedQuantity,
      costPrice: new Prisma.Decimal(data.costPrice),
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

export async function createVehicleLoadAction(formData: FormData) {
  const data = vehicleLoadSchema.parse(Object.fromEntries(formData));
  const redirectTo = getSafeRedirectPath(formData, `/operations/vehicle-stock?vehicleId=${data.vehicleId}`);
  const loadDate = dateInputToDate(data.loadDate);

  await prisma.$transaction(async (tx) => {
    const batch = await tx.productBatch.findUnique({
      where: { id: data.batchId },
      include: { product: true }
    });
    if (!batch) throw new Error("Selected batch was not found");

    const warehouseBalance = await getSafeWarehouseAvailableFromDate(tx, data.batchId, loadDate);
    if (data.quantityLoaded > warehouseBalance) {
      throw new Error(`Only ${warehouseBalance} items are available in warehouse for this batch`);
    }

    const createdLoad = await tx.vehicleLoad.create({
      data: {
        vehicleId: data.vehicleId,
        loadDate
      }
    });

    const loadItem = await tx.vehicleLoadItem.create({
      data: {
        loadId: createdLoad.id,
        batchId: data.batchId,
        quantityLoaded: data.quantityLoaded
      }
    });

    await tx.vehicleStockLedger.create({
      data: {
        vehicleId: data.vehicleId,
        productId: batch.productId,
        batchId: data.batchId,
        transactionType: "load",
        quantityChange: data.quantityLoaded,
        transactionDate: loadDate,
        loadItemId: loadItem.id
      }
    });

    return createdLoad;
  });

  revalidatePath("/operations/vehicle-stock");
  revalidatePath("/stock");
  redirect(redirectTo);
}

export async function createVehicleLoadFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const data = vehicleLoadSchema.parse(Object.fromEntries(formData));
    const loadDate = dateInputToDate(data.loadDate);

    await prisma.$transaction(async (tx) => {
      const batch = await tx.productBatch.findUnique({
        where: { id: data.batchId },
        include: { product: true }
      });
      if (!batch) throw new Error("Selected batch was not found");

      const warehouseBalance = await getSafeWarehouseAvailableFromDate(tx, data.batchId, loadDate);
      if (data.quantityLoaded > warehouseBalance) {
        throw new Error(`Only ${warehouseBalance} units are available in warehouse for ${batch.product.name}. Reduce the quantity and try again.`);
      }

      const createdLoad = await tx.vehicleLoad.create({
        data: {
          vehicleId: data.vehicleId,
          loadDate
        }
      });

      const loadItem = await tx.vehicleLoadItem.create({
        data: {
          loadId: createdLoad.id,
          batchId: data.batchId,
          quantityLoaded: data.quantityLoaded
        }
      });

      await tx.vehicleStockLedger.create({
        data: {
          vehicleId: data.vehicleId,
          productId: batch.productId,
          batchId: data.batchId,
          transactionType: "load",
          quantityChange: data.quantityLoaded,
          transactionDate: loadDate,
          loadItemId: loadItem.id
        }
      });
    });

    revalidatePath("/operations/vehicle-stock");
    revalidatePath("/stock");
    return { ok: true, message: "Vehicle load saved." };
  } catch (error) {
    return { ok: false, message: getActionErrorMessage(error, "Unable to save vehicle load.") };
  }
}

export async function createInvoiceAction(formData: FormData) {
  const data = invoiceSchema.parse({
    ...Object.fromEntries(formData),
    items: getInvoiceItemsFromForm(formData)
  });
  const invoiceDate = dateInputToDate(data.invoiceDate);

  const invoice = await prisma.$transaction(async (tx) => {
    const batches = await tx.productBatch.findMany({
      where: { id: { in: data.items.map((item) => item.batchId) } },
      include: { product: true }
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const available = await getSafeVehicleBatchAvailableFromDate(tx, data.vehicleId, item.batchId, invoiceDate);
      if (item.quantity > available) {
        throw new Error(`Only ${available} items are available on vehicle for ${batch.product.name}`);
      }
    }

    const total = data.items.reduce((sum, item) => {
      const batch = batchById.get(item.batchId);
      return sum + item.quantity * Number(batch?.product.sellingPrice ?? 0);
    }, 0);

    const createdInvoice = await tx.invoice.create({
      data: {
        shopId: data.shopId,
        vehicleId: data.vehicleId,
        invoiceType: "sale",
        invoiceDate,
        totalAmount: new Prisma.Decimal(total)
      }
    });

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const unitPrice = batch.product.sellingPrice;
      const invoiceItem = await tx.invoiceItem.create({
        data: {
          invoiceId: createdInvoice.id,
          productId: batch.productId,
          batchId: batch.id,
          quantity: item.quantity,
          unitPrice,
          lineTotal: new Prisma.Decimal(Number(unitPrice) * item.quantity)
        }
      });

      await tx.vehicleStockLedger.create({
        data: {
          vehicleId: data.vehicleId,
          productId: batch.productId,
          batchId: batch.id,
          transactionType: "sale",
          quantityChange: -item.quantity,
          transactionDate: invoiceDate,
          invoiceItemId: invoiceItem.id
        }
      });
    }

    return createdInvoice;
  });

  revalidatePath("/invoices");
  revalidatePath(`/shops/${data.shopId}`);
  revalidatePath("/operations/vehicle-stock");
  redirect(`/invoices/${invoice.id}`);
}

export async function createInvoiceFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(createInvoiceAction, formData, "Unable to create invoice.");
}

export async function createOpeningInvoiceAction(formData: FormData) {
  const data = openingInvoiceSchema.parse(Object.fromEntries(formData));

  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        shopId: data.shopId,
        invoiceType: "opening",
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        invoiceDate: dateInputToDate(data.invoiceDate),
        totalAmount: new Prisma.Decimal(data.totalAmount),
        paidStatus: data.alreadyPaidAmount > 0 ? "partial" : "unpaid"
      }
    });

    if (data.alreadyPaidAmount > 0) {
      const payment = await tx.payment.create({
        data: {
          shopId: data.shopId,
          invoiceId: createdInvoice.id,
          paymentDate: dateInputToDate(data.invoiceDate),
          amount: new Prisma.Decimal(data.alreadyPaidAmount),
          method: "cash",
          notes: "Opening paid amount"
        }
      });

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: createdInvoice.id,
          amount: new Prisma.Decimal(data.alreadyPaidAmount)
        }
      });
    }

    return createdInvoice;
  });

  revalidatePath("/invoices");
  revalidatePath(`/shops/${data.shopId}`);
  redirect(`/invoices/${invoice.id}`);
}

export async function createOpeningInvoiceFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(createOpeningInvoiceAction, formData, "Unable to save old invoice.");
}

export async function updateInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId"));
  const data = invoiceSchema.parse({
    ...Object.fromEntries(formData),
    items: getInvoiceItemsFromForm(formData)
  });
  const invoiceDate = dateInputToDate(data.invoiceDate);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { allocations: true, payments: true }
    });
    if (!existing) throw new Error("Invoice not found");
    if (existing.invoiceType === "opening") throw new Error("Old invoices cannot be edited here");
    if (existing.allocations.length > 0 || existing.payments.length > 0) {
      throw new Error("Invoices with payments cannot be edited");
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId } });

    const batches = await tx.productBatch.findMany({
      where: { id: { in: data.items.map((item) => item.batchId) } },
      include: { product: true }
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const available = await getSafeVehicleBatchAvailableFromDate(tx, data.vehicleId, item.batchId, invoiceDate);
      if (item.quantity > available) {
        throw new Error(`Only ${available} items are available on vehicle for ${batch.product.name}`);
      }
    }

    const total = data.items.reduce((sum, item) => {
      const batch = batchById.get(item.batchId);
      return sum + item.quantity * Number(batch?.product.sellingPrice ?? 0);
    }, 0);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        shopId: data.shopId,
        vehicleId: data.vehicleId,
        invoiceDate,
        totalAmount: new Prisma.Decimal(total),
        paidStatus: "unpaid"
      }
    });

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const unitPrice = batch.product.sellingPrice;
      const invoiceItem = await tx.invoiceItem.create({
        data: {
          invoiceId,
          productId: batch.productId,
          batchId: batch.id,
          quantity: item.quantity,
          unitPrice,
          lineTotal: new Prisma.Decimal(Number(unitPrice) * item.quantity)
        }
      });

      await tx.vehicleStockLedger.create({
        data: {
          vehicleId: data.vehicleId,
          productId: batch.productId,
          batchId: batch.id,
          transactionType: "sale",
          quantityChange: -item.quantity,
          transactionDate: invoiceDate,
          invoiceItemId: invoiceItem.id
        }
      });
    }
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/shops/${data.shopId}`);
  revalidatePath("/operations/vehicle-stock");
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoiceFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(updateInvoiceAction, formData, "Unable to update invoice.");
}

export async function createVehicleReturnAction(formData: FormData) {
  const data = vehicleReturnSchema.parse({
    ...Object.fromEntries(formData),
    items: getReturnItemsFromForm(formData)
  });
  const redirectTo = getSafeRedirectPath(formData, `/operations/vehicle-stock?vehicleId=${data.vehicleId}`);
  const returnDate = dateInputToDate(data.returnDate);

  await prisma.$transaction(async (tx) => {
    const batches = await tx.productBatch.findMany({
      where: { id: { in: data.items.map((item) => item.batchId) } },
      include: { product: true }
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const balances = await getVehicleBatchBalances(tx, data.vehicleId, data.items.map((item) => item.batchId), returnDate);

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const available = await getSafeVehicleBatchAvailableFromDate(tx, data.vehicleId, item.batchId, returnDate);
      if (item.quantityReturned > available) {
        throw new Error(`Only ${available} items are available on vehicle for ${batch.product.name}`);
      }
    }

    const createdReturn = await tx.vehicleReturn.create({
      data: {
        vehicleId: data.vehicleId,
        returnDate,
        notes: data.notes
      }
    });

    for (const item of data.items) {
      const batch = batchById.get(item.batchId);
      if (!batch) throw new Error("Selected batch was not found");
      const balance = balances.get(item.batchId) ?? 0;
      const returnItem = await tx.vehicleReturnItem.create({
        data: {
          returnId: createdReturn.id,
          batchId: batch.id,
          quantityExpected: balance,
          quantityReturned: item.quantityReturned
        }
      });

      await tx.vehicleStockLedger.create({
        data: {
          vehicleId: data.vehicleId,
          productId: batch.productId,
          batchId: batch.id,
          transactionType: "return_to_warehouse",
          quantityChange: -item.quantityReturned,
          transactionDate: returnDate,
          returnItemId: returnItem.id
        }
      });
    }

    return createdReturn;
  });

  revalidatePath("/operations/vehicle-stock");
  revalidatePath("/stock");
  redirect(redirectTo);
}

export async function createVehicleReturnFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(createVehicleReturnAction, formData, "Unable to save return.");
}

export async function deleteVehicleReturnAction(formData: FormData) {
  const id = String(formData.get("returnId") ?? "");
  const redirectTo = getSafeRedirectPath(formData, "/operations/vehicle-stock");
  if (!id) throw new Error("Return record is required");

  const vehicleReturn = await prisma.vehicleReturn.findUnique({
    where: { id },
    select: { vehicleId: true }
  });
  if (!vehicleReturn) throw new Error("Return record not found");

  await prisma.vehicleReturn.delete({ where: { id } });
  revalidatePath("/operations/vehicle-stock");
  revalidatePath(`/operations/vehicle-stock?vehicleId=${vehicleReturn.vehicleId}`);
  revalidatePath("/stock");
  redirect(redirectTo);
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
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/operations/vehicle-stock");
  revalidatePath("/stock");
  revalidatePath("/reports");
  revalidatePath("/reports/daily");
  revalidatePath("/reports/monthly");
  revalidatePath(`/shops/${invoice.shopId}`);
  redirect(`/shops/${invoice.shopId}`);
}

export async function createPaymentAction(formData: FormData) {
  const data = paymentSchema.parse(Object.fromEntries(formData));
  const manualAllocations = getManualPaymentAllocations(formData);
  const selectedInvoiceIds = getSelectedInvoiceIds(formData);
  const affectedInvoiceIds = await prisma.$transaction(async (tx) => {
    if (manualAllocations.length > 0) {
      const allocationTotal = manualAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      if (allocationTotal > data.amount) {
        throw new Error("Allocated invoice amounts cannot be more than the payment amount");
      }

      for (const allocation of manualAllocations) {
        const invoice = await tx.invoice.findUnique({
          where: { id: allocation.invoiceId },
          select: { id: true, shopId: true, totalAmount: true }
        });
        if (!invoice || invoice.shopId !== data.shopId) throw new Error("Selected invoice does not belong to this shop");

        const remainingInvoiceAmount = await getInvoiceUnallocatedAmount(tx, allocation.invoiceId);
        if (allocation.amount > remainingInvoiceAmount) {
          throw new Error("Allocated amount is more than the invoice remaining balance");
        }
      }
    }

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

    if (manualAllocations.length > 0) {
      for (const allocation of manualAllocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            amount: new Prisma.Decimal(allocation.amount)
          }
        });
      }
      return new Set(manualAllocations.map((allocation) => allocation.invoiceId));
    }

    return reallocatePayment(tx, payment.id, data.invoiceId, selectedInvoiceIds);
  });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${data.shopId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function createPaymentFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(createPaymentAction, formData, "Unable to save payment.");
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
  revalidatePath("/invoices");
  revalidatePath("/payments");
  for (const invoiceId of affectedInvoiceIds) revalidatePath(`/invoices/${invoiceId}`);
}

export async function updatePaymentFormAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  return runActionWithInlineError(updatePaymentAction, formData, "Unable to update payment.");
}

export async function deletePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const existing = await prisma.payment.findUnique({ where: { id }, include: { allocations: true } });
  if (!existing) throw new Error("Payment not found");
  const affectedInvoiceIds = [
    ...existing.allocations.map((allocation) => allocation.invoiceId),
    ...(existing.invoiceId ? [existing.invoiceId] : [])
  ];
  const payment = await prisma.payment.delete({ where: { id } });
  await refreshInvoices(affectedInvoiceIds);
  revalidatePath(`/shops/${payment.shopId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
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
  revalidatePath("/invoices");
  revalidatePath("/payments");
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
