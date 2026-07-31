import { paymentCountsTowardBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, startOfToday, toDateInputValue } from "@/lib/dates";

function currentMonthInput() {
  return toDateInputValue(startOfToday()).slice(0, 7);
}

export function monthRangeFromInput(value?: string | null) {
  const selected = value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonthInput();
  const start = dateInputToDate(`${selected}-01`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { selected, start, end };
}

function previousMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function outstandingAt(date: Date) {
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { invoiceDate: { lt: date } },
      select: { totalAmount: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { lt: date } },
      select: { amount: true, method: true, chequeStatus: true }
    })
  ]);

  return (
    invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) -
    payments.filter(paymentCountsTowardBalance).reduce((sum, payment) => sum + Number(payment.amount), 0)
  );
}

async function monthCore(month: string, supplierId?: string) {
  const { selected, start, end } = monthRangeFromInput(month);
  const [invoices, payments, loads, returns] = await Promise.all([
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lt: end } },
      include: {
        shop: true,
        vehicle: true,
        items: { include: { product: { include: { supplier: true } }, batch: true } }
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lt: end } },
      include: { shop: true },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.vehicleLoad.findMany({
      where: { loadDate: { gte: start, lt: end } },
      include: { vehicle: true, items: { include: { batch: { include: { product: true } } } } },
      orderBy: [{ loadDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.vehicleReturn.findMany({
      where: { returnDate: { gte: start, lt: end } },
      include: { vehicle: true, items: { include: { batch: { include: { product: true } } } } },
      orderBy: [{ returnDate: "asc" }, { createdAt: "asc" }]
    })
  ]);

  function matchesSupplier(productSupplierId: string) {
    return !supplierId || productSupplierId === supplierId;
  }

  const saleInvoices = invoices.filter((invoice) => invoice.invoiceType === "sale");
  const openingInvoices = invoices.filter((invoice) => invoice.invoiceType === "opening");
  const countedPayments = payments.filter(paymentCountsTowardBalance);
  const sales = saleInvoices.reduce((sum, invoice) => {
    if (!supplierId) return sum + Number(invoice.totalAmount);
    return sum + invoice.items
      .filter((item) => matchesSupplier(item.product.supplierId))
      .reduce((itemSum, item) => itemSum + Number(item.lineTotal), 0);
  }, 0);
  const openingBalanceAdded = supplierId
    ? 0
    : openingInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const paymentsReceived = countedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const loadedUnits = loads.reduce((sum, load) => sum + load.items
    .filter((item) => matchesSupplier(item.batch.product.supplierId))
    .reduce((itemSum, item) => itemSum + item.quantityLoaded, 0), 0);
  const returnedUnits = returns.reduce((sum, vehicleReturn) => sum + vehicleReturn.items
    .filter((item) => matchesSupplier(item.batch.product.supplierId))
    .reduce((itemSum, item) => itemSum + item.quantityReturned, 0), 0);
  const soldUnits = saleInvoices.reduce((sum, invoice) => sum + invoice.items
    .filter((item) => matchesSupplier(item.product.supplierId))
    .reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const profit = saleInvoices.reduce((sum, invoice) => {
    return sum + invoice.items.filter((item) => matchesSupplier(item.product.supplierId)).reduce((itemSum, item) => {
      const revenue = Number(item.lineTotal);
      const cost = Number(item.batch.costPrice) * item.quantity;
      return itemSum + revenue - cost;
    }, 0);
  }, 0);

  return { selected, start, end, invoices, saleInvoices, payments, loads, returns, totals: { sales, openingBalanceAdded, paymentsReceived, loadedUnits, returnedUnits, soldUnits, profit } };
}

export async function getMonthlyProgress(month?: string | null, supplierId?: string) {
  return getMonthlyProgressForSupplier(month, supplierId);
}

export async function getMonthlyProgressForSupplier(month?: string | null, supplierId?: string) {
  const { selected } = monthRangeFromInput(month);
  const previous = previousMonth(selected);
  const supplier = supplierId
    ? await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } })
    : null;
  const effectiveSupplierId = supplier?.id;
  const [current, previousData] = await Promise.all([monthCore(selected, effectiveSupplierId), monthCore(previous, effectiveSupplierId)]);
  const [outstandingStart, outstandingEnd, previousOutstandingStart, previousOutstandingEnd] = await Promise.all([
    outstandingAt(current.start),
    outstandingAt(current.end),
    outstandingAt(previousData.start),
    outstandingAt(previousData.end)
  ]);

  const vehicleMap = new Map<string, { vehicleId: string; vehicle: string; loaded: number; sold: number; returned: number }>();
  const productMap = new Map<string, { productId: string; product: string; supplier: string; unitsSold: number; revenue: number; profit: number }>();
  const shopMap = new Map<string, { shopId: string; shop: string; invoiceTotal: number; paymentsReceived: number }>();
  const trendMap = new Map<string, number>();

  for (let date = new Date(current.start); date < current.end; date.setUTCDate(date.getUTCDate() + 1)) {
    trendMap.set(toDateInputValue(date), 0);
  }

  for (const load of current.loads) {
    const row = vehicleMap.get(load.vehicleId) ?? { vehicleId: load.vehicleId, vehicle: load.vehicle.nameOrNumber, loaded: 0, sold: 0, returned: 0 };
    row.loaded += load.items
      .filter((item) => !effectiveSupplierId || item.batch.product.supplierId === effectiveSupplierId)
      .reduce((sum, item) => sum + item.quantityLoaded, 0);
    vehicleMap.set(load.vehicleId, row);
  }

  for (const vehicleReturn of current.returns) {
    const row = vehicleMap.get(vehicleReturn.vehicleId) ?? { vehicleId: vehicleReturn.vehicleId, vehicle: vehicleReturn.vehicle.nameOrNumber, loaded: 0, sold: 0, returned: 0 };
    row.returned += vehicleReturn.items
      .filter((item) => !effectiveSupplierId || item.batch.product.supplierId === effectiveSupplierId)
      .reduce((sum, item) => sum + item.quantityReturned, 0);
    vehicleMap.set(vehicleReturn.vehicleId, row);
  }

  for (const invoice of current.saleInvoices) {
    const matchingItems = invoice.items.filter((item) => !effectiveSupplierId || item.product.supplierId === effectiveSupplierId);
    if (effectiveSupplierId && matchingItems.length === 0) continue;
    const invoiceTotal = effectiveSupplierId
      ? matchingItems.reduce((sum, item) => sum + Number(item.lineTotal), 0)
      : Number(invoice.totalAmount);
    const day = toDateInputValue(invoice.invoiceDate);
    trendMap.set(day, (trendMap.get(day) ?? 0) + invoiceTotal);

    const shop = shopMap.get(invoice.shopId) ?? { shopId: invoice.shopId, shop: invoice.shop.name, invoiceTotal: 0, paymentsReceived: 0 };
    shop.invoiceTotal += invoiceTotal;
    shopMap.set(invoice.shopId, shop);

    if (invoice.vehicleId && invoice.vehicle) {
      const vehicle = vehicleMap.get(invoice.vehicleId) ?? { vehicleId: invoice.vehicleId, vehicle: invoice.vehicle.nameOrNumber, loaded: 0, sold: 0, returned: 0 };
      vehicle.sold += matchingItems.reduce((sum, item) => sum + item.quantity, 0);
      vehicleMap.set(invoice.vehicleId, vehicle);
    }

    for (const item of matchingItems) {
      const product = productMap.get(item.productId) ?? {
        productId: item.productId,
        product: `${item.product.name} ${item.product.measurement}`,
        supplier: item.product.supplier.name,
        unitsSold: 0,
        revenue: 0,
        profit: 0
      };
      const revenue = Number(item.lineTotal);
      const cost = Number(item.batch.costPrice) * item.quantity;
      product.unitsSold += item.quantity;
      product.revenue += revenue;
      product.profit += revenue - cost;
      productMap.set(item.productId, product);
    }
  }

  for (const payment of current.payments.filter(paymentCountsTowardBalance)) {
    const shop = shopMap.get(payment.shopId) ?? { shopId: payment.shopId, shop: payment.shop.name, invoiceTotal: 0, paymentsReceived: 0 };
    shop.paymentsReceived += Number(payment.amount);
    shopMap.set(payment.shopId, shop);
  }

  const outstandingChange = outstandingEnd - outstandingStart;
  const previousOutstandingChange = previousOutstandingEnd - previousOutstandingStart;

  return {
    selected,
    label: monthLabel(selected),
    previous,
    previousLabel: monthLabel(previous),
    supplier,
    isSupplierFiltered: Boolean(effectiveSupplierId),
    vehicleRows: Array.from(vehicleMap.values())
      .filter((vehicle) => vehicle.loaded > 0 || vehicle.sold > 0 || vehicle.returned > 0)
      .map((vehicle) => ({
        ...vehicle,
        sellThrough: vehicle.loaded > 0 ? (vehicle.sold / vehicle.loaded) * 100 : 0
      }))
      .sort((a, b) => b.sold - a.sold),
    productRows: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
    shopRows: Array.from(shopMap.values()).sort((a, b) => b.invoiceTotal - a.invoiceTotal),
    dailyTrend: Array.from(trendMap.entries()).map(([date, sales]) => ({ date, sales })),
    totals: {
      ...current.totals,
      outstandingChange
    },
    comparisons: {
      sales: percentChange(current.totals.sales, previousData.totals.sales),
      openingBalanceAdded: percentChange(current.totals.openingBalanceAdded, previousData.totals.openingBalanceAdded),
      paymentsReceived: percentChange(current.totals.paymentsReceived, previousData.totals.paymentsReceived),
      outstandingChange: percentChange(outstandingChange, previousOutstandingChange),
      soldUnits: percentChange(current.totals.soldUnits, previousData.totals.soldUnits),
      loadedUnits: percentChange(current.totals.loadedUnits, previousData.totals.loadedUnits),
      returnedUnits: percentChange(current.totals.returnedUnits, previousData.totals.returnedUnits),
      profit: percentChange(current.totals.profit, previousData.totals.profit)
    }
  };
}
