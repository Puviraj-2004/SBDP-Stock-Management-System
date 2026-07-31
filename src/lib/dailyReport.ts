import { paymentCountsTowardBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, startOfToday, toDateInputValue } from "@/lib/dates";

export function dateRangeFromInput(value?: string) {
  const selected = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateInputValue(startOfToday());
  const start = dateInputToDate(selected);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { selected, start, end };
}

function invoiceLabel(invoice: { invoiceType: "sale" | "opening"; invoiceDate: Date; referenceNumber: string | null }) {
  if (invoice.invoiceType === "opening") {
    return invoice.referenceNumber ? `Old invoice ${invoice.referenceNumber}` : `Old invoice ${displayDate(invoice.invoiceDate)}`;
  }
  return `Invoice ${displayDate(invoice.invoiceDate)}`;
}

type DailyInvoiceRow = {
  id: string;
  shop: string;
  vehicle: string;
  amount: number;
  status: "paid" | "partial" | "unpaid";
  label: string;
  invoiceType: "sale" | "opening";
};

export async function getDailyProgress(date?: string, supplierId?: string) {
  return getDailyProgressForSupplier(date, supplierId);
}

export async function getDailyProgressForSupplier(date?: string, supplierId?: string) {
  const { selected, start, end } = dateRangeFromInput(date);
  const asOfDate = dateInputToDate(selected);
  const supplierWhere = supplierId ? { product: { supplierId } } : {};

  const [loads, returns, invoices, payments, vehicleBalances] = await Promise.all([
    prisma.vehicleLoad.findMany({
      where: { loadDate: { gte: start, lt: end } },
      include: { vehicle: true, items: { include: { batch: { include: { product: true } } } } },
      orderBy: [{ loadDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.vehicleReturn.findMany({
      where: { returnDate: { gte: start, lt: end } },
      include: { vehicle: true, items: { include: { batch: { include: { product: true } } } } },
      orderBy: [{ returnDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lt: end } },
      include: {
        shop: true,
        vehicle: true,
        items: { include: { product: true, batch: true } }
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lt: end } },
      include: {
        shop: true,
        allocations: { include: { invoice: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.vehicleStockLedger.findMany({
      where: { transactionDate: { lte: asOfDate }, ...supplierWhere },
      select: { vehicleId: true, quantityChange: true }
    })
  ]);

  const supplier = supplierId
    ? await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } })
    : null;
  const effectiveSupplierId = supplier?.id;

  function matchesSupplier(productSupplierId: string) {
    return !effectiveSupplierId || productSupplierId === effectiveSupplierId;
  }

  const saleInvoices = invoices.filter((invoice) => invoice.invoiceType === "sale");
  const openingInvoices = invoices.filter((invoice) => invoice.invoiceType === "opening");
  const vehicleIds = Array.from(new Set([
    ...loads.flatMap((load) => load.items.some((item) => matchesSupplier(item.batch.product.supplierId)) ? [load.vehicleId] : []),
    ...returns.flatMap((vehicleReturn) => vehicleReturn.items.some((item) => matchesSupplier(item.batch.product.supplierId)) ? [vehicleReturn.vehicleId] : []),
    ...saleInvoices.flatMap((invoice) => invoice.vehicleId && invoice.items.some((item) => matchesSupplier(item.product.supplierId)) ? [invoice.vehicleId] : []),
    ...vehicleBalances.flatMap((row) => row.quantityChange > 0 ? [row.vehicleId] : [])
  ]));
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    orderBy: { nameOrNumber: "asc" }
  });
  const vehicleNameById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.nameOrNumber]));
  const currentBalanceByVehicle = new Map<string, number>();
  for (const row of vehicleBalances) {
    currentBalanceByVehicle.set(row.vehicleId, (currentBalanceByVehicle.get(row.vehicleId) ?? 0) + row.quantityChange);
  }

  const vehicleRows = vehicleIds.map((vehicleId) => {
    const loaded = loads
      .filter((load) => load.vehicleId === vehicleId)
      .reduce((sum, load) => sum + load.items
        .filter((item) => matchesSupplier(item.batch.product.supplierId))
        .reduce((itemSum, item) => itemSum + item.quantityLoaded, 0), 0);
    const returned = returns
      .filter((vehicleReturn) => vehicleReturn.vehicleId === vehicleId)
      .reduce((sum, vehicleReturn) => sum + vehicleReturn.items
        .filter((item) => matchesSupplier(item.batch.product.supplierId))
        .reduce((itemSum, item) => itemSum + item.quantityReturned, 0), 0);
    const sold = saleInvoices
      .filter((invoice) => invoice.vehicleId === vehicleId)
      .reduce((sum, invoice) => sum + invoice.items
        .filter((item) => matchesSupplier(item.product.supplierId))
        .reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    return {
      vehicleId,
      vehicle: vehicleNameById.get(vehicleId) ?? "Unknown vehicle",
      loaded,
      sold,
      returned,
      currentBalance: currentBalanceByVehicle.get(vehicleId) ?? 0
    };
  }).sort((a, b) => a.vehicle.localeCompare(b.vehicle));

  const countedPayments = payments.filter(paymentCountsTowardBalance);
  const pendingCheques = payments.filter((payment) => payment.method === "cheque" && payment.chequeStatus === "pending");
  const supplierSaleInvoiceRows = saleInvoices
    .map((invoice) => {
      const items = invoice.items.filter((item) => matchesSupplier(item.product.supplierId));
      const amount = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      return { invoice, items, amount };
    })
    .filter((row) => row.items.length > 0 || !effectiveSupplierId);
  const invoiceValue = supplierSaleInvoiceRows.reduce((sum, row) => sum + (effectiveSupplierId ? row.amount : Number(row.invoice.totalAmount)), 0);
  const openingBalanceAdded = effectiveSupplierId
    ? 0
    : openingInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const profit = saleInvoices.reduce((sum, invoice) => {
    return sum + invoice.items.filter((item) => matchesSupplier(item.product.supplierId)).reduce((itemSum, item) => {
      const revenue = Number(item.lineTotal);
      const cost = Number(item.batch.costPrice) * item.quantity;
      return itemSum + revenue - cost;
    }, 0);
  }, 0);
  const productMap = new Map<string, {
    productId: string;
    product: string;
    loaded: number;
    sold: number;
    returned: number;
    revenue: number;
    profit: number;
  }>();

  function productRow(product: { id: string; name: string; measurement: string }) {
    const existing = productMap.get(product.id);
    if (existing) return existing;
    const row = {
      productId: product.id,
      product: `${product.name} ${product.measurement}`,
      loaded: 0,
      sold: 0,
      returned: 0,
      revenue: 0,
      profit: 0
    };
    productMap.set(product.id, row);
    return row;
  }

  for (const load of loads) {
    for (const item of load.items.filter((row) => matchesSupplier(row.batch.product.supplierId))) {
      productRow(item.batch.product).loaded += item.quantityLoaded;
    }
  }

  for (const vehicleReturn of returns) {
    for (const item of vehicleReturn.items.filter((row) => matchesSupplier(row.batch.product.supplierId))) {
      productRow(item.batch.product).returned += item.quantityReturned;
    }
  }

  for (const invoice of saleInvoices) {
    for (const item of invoice.items.filter((row) => matchesSupplier(row.product.supplierId))) {
      const row = productRow(item.product);
      const revenue = Number(item.lineTotal);
      const cost = Number(item.batch.costPrice) * item.quantity;
      row.sold += item.quantity;
      row.revenue += revenue;
      row.profit += revenue - cost;
    }
  }

  const invoiceRows: DailyInvoiceRow[] = invoices.flatMap((invoice): DailyInvoiceRow[] => {
    if (invoice.invoiceType === "opening") {
      if (effectiveSupplierId) return [];
      return [{
        id: invoice.id,
        shop: invoice.shop.name,
        vehicle: "-",
        amount: Number(invoice.totalAmount),
        status: invoice.paidStatus,
        label: invoiceLabel(invoice),
        invoiceType: invoice.invoiceType
      }];
    }

    const items = invoice.items.filter((item) => matchesSupplier(item.product.supplierId));
    if (effectiveSupplierId && items.length === 0) return [];
    return [{
      id: invoice.id,
      shop: invoice.shop.name,
      vehicle: invoice.vehicle?.nameOrNumber ?? "-",
      amount: effectiveSupplierId ? items.reduce((sum, item) => sum + Number(item.lineTotal), 0) : Number(invoice.totalAmount),
      status: invoice.paidStatus,
      label: invoiceLabel(invoice),
      invoiceType: invoice.invoiceType
    }];
  });

  const paymentRows = payments.map((payment) => ({
    id: payment.id,
    shopId: payment.shopId,
    shop: payment.shop.name,
    amount: Number(payment.amount),
    method: payment.method,
    chequeStatus: payment.chequeStatus,
    counted: paymentCountsTowardBalance(payment),
    allocations: payment.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      label: invoiceLabel(allocation.invoice),
      amount: Number(allocation.amount),
      full: Number(allocation.amount) >= Number(allocation.invoice.totalAmount)
    }))
  }));

  const hasProductActivity = vehicleRows.some((row) => row.loaded > 0 || row.sold > 0 || row.returned > 0) || supplierSaleInvoiceRows.length > 0;
  const hasActivity = effectiveSupplierId ? hasProductActivity : loads.length > 0 || returns.length > 0 || invoices.length > 0 || payments.length > 0;

  return {
    selected,
    supplier,
    isSupplierFiltered: Boolean(effectiveSupplierId),
    hasActivity,
    vehicleRows,
    productRows: Array.from(productMap.values())
      .filter((row) => row.loaded > 0 || row.sold > 0 || row.returned > 0)
      .sort((a, b) => b.revenue - a.revenue || b.sold - a.sold || a.product.localeCompare(b.product)),
    invoices: invoiceRows,
    payments: paymentRows,
    totals: {
      sales: invoiceValue,
      profit,
      openingBalanceAdded,
      paymentsReceived: countedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      loadedUnits: vehicleRows.reduce((sum, row) => sum + row.loaded, 0),
      loadedVehicles: vehicleRows.filter((row) => row.loaded > 0).length,
      soldUnits: vehicleRows.reduce((sum, row) => sum + row.sold, 0),
      returnedUnits: vehicleRows.reduce((sum, row) => sum + row.returned, 0),
      pendingChequeValue: pendingCheques.reduce((sum, payment) => sum + Number(payment.amount), 0),
      invoiceCount: supplierSaleInvoiceRows.length,
      oldInvoiceCount: effectiveSupplierId ? 0 : openingInvoices.length,
      paymentCount: payments.length
    }
  };
}
