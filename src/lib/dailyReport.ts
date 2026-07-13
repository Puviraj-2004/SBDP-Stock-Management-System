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

export async function getDailyProgress(date?: string) {
  const { selected, start, end } = dateRangeFromInput(date);
  const asOfDate = dateInputToDate(selected);

  const [loads, returns, invoices, payments, vehicleBalances] = await Promise.all([
    prisma.vehicleLoad.findMany({
      where: { loadDate: { gte: start, lt: end } },
      include: { vehicle: true, items: true },
      orderBy: [{ loadDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.vehicleReturn.findMany({
      where: { returnDate: { gte: start, lt: end } },
      include: { vehicle: true, items: true },
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
    prisma.vehicleStockLedger.groupBy({
      by: ["vehicleId"],
      where: { transactionDate: { lte: asOfDate } },
      _sum: { quantityChange: true }
    })
  ]);

  const vehicleIds = Array.from(new Set([
    ...loads.map((load) => load.vehicleId),
    ...returns.map((vehicleReturn) => vehicleReturn.vehicleId),
    ...invoices.flatMap((invoice) => invoice.vehicleId ? [invoice.vehicleId] : []),
    ...vehicleBalances.flatMap((row) => (row._sum.quantityChange ?? 0) > 0 ? [row.vehicleId] : [])
  ]));
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    orderBy: { nameOrNumber: "asc" }
  });
  const vehicleNameById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.nameOrNumber]));
  const currentBalanceByVehicle = new Map(vehicleBalances.map((row) => [row.vehicleId, row._sum.quantityChange ?? 0]));

  const vehicleRows = vehicleIds.map((vehicleId) => {
    const loaded = loads
      .filter((load) => load.vehicleId === vehicleId)
      .reduce((sum, load) => sum + load.items.reduce((itemSum, item) => itemSum + item.quantityLoaded, 0), 0);
    const returned = returns
      .filter((vehicleReturn) => vehicleReturn.vehicleId === vehicleId)
      .reduce((sum, vehicleReturn) => sum + vehicleReturn.items.reduce((itemSum, item) => itemSum + item.quantityReturned, 0), 0);
    const sold = invoices
      .filter((invoice) => invoice.vehicleId === vehicleId)
      .reduce((sum, invoice) => sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

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
  const invoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const profit = invoices.reduce((sum, invoice) => {
    return sum + invoice.items.reduce((itemSum, item) => {
      const revenue = Number(item.lineTotal);
      const cost = Number(item.batch.costPrice) * item.quantity;
      return itemSum + revenue - cost;
    }, 0);
  }, 0);

  const invoiceRows = invoices.map((invoice) => ({
    id: invoice.id,
    shop: invoice.shop.name,
    vehicle: invoice.vehicle?.nameOrNumber ?? "-",
    amount: Number(invoice.totalAmount),
    status: invoice.paidStatus,
    label: invoiceLabel(invoice)
  }));

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

  const hasActivity = loads.length > 0 || returns.length > 0 || invoices.length > 0 || payments.length > 0;

  return {
    selected,
    hasActivity,
    vehicleRows,
    invoices: invoiceRows,
    payments: paymentRows,
    totals: {
      sales: invoiceValue,
      profit,
      paymentsReceived: countedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      loadedUnits: vehicleRows.reduce((sum, row) => sum + row.loaded, 0),
      loadedVehicles: vehicleRows.filter((row) => row.loaded > 0).length,
      soldUnits: vehicleRows.reduce((sum, row) => sum + row.sold, 0),
      returnedUnits: vehicleRows.reduce((sum, row) => sum + row.returned, 0),
      pendingChequeValue: pendingCheques.reduce((sum, payment) => sum + Number(payment.amount), 0),
      invoiceCount: invoices.length,
      paymentCount: payments.length
    }
  };
}
