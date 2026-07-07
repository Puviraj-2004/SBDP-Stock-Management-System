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

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export async function getMonthlyProgress(month?: string | null) {
  const { selected, start, end } = monthRangeFromInput(month);

  const [invoices, payments, trips, stockReceived, allInvoices, allPayments] = await Promise.all([
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lt: end } },
      include: {
        shop: true,
        trip: { include: { vehicle: true } },
        items: { include: { product: { include: { supplier: true } } } },
        allocations: { include: { payment: true } }
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lt: end } },
      include: { shop: true, allocations: { include: { invoice: true } } },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.loadingTrip.findMany({
      where: { tripDate: { gte: start, lt: end } },
      include: {
        vehicle: true,
        supplier: true,
        items: true,
        invoices: { select: { id: true, totalAmount: true } }
      },
      orderBy: [{ tripDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.productBatch.findMany({
      where: { receivedDate: { gte: start, lt: end } },
      include: { product: { include: { supplier: true } } },
      orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.invoice.findMany({ select: { totalAmount: true } }),
    prisma.payment.findMany({ select: { amount: true, method: true, chequeStatus: true } })
  ]);

  const countedPayments = payments.filter(paymentCountsTowardBalance);
  const allCountedPayments = allPayments.filter(paymentCountsTowardBalance);
  const invoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const collectionValue = countedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalOutstanding =
    allInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) -
    allCountedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const productMap = new Map<string, { product: string; supplier: string; quantity: number; value: number }>();
  const shopMap = new Map<string, { shop: string; invoices: number; value: number; paid: number; remaining: number }>();
  const vehicleMap = new Map<
    string,
    {
      vehicle: string;
      trips: number;
      invoices: number;
      sales: number;
      collections: number;
      loaded: number;
      returned: number;
      expectedSold: number;
    }
  >();

  for (const trip of trips) {
    const current =
      vehicleMap.get(trip.vehicleId) ??
      {
        vehicle: trip.vehicle.nameOrNumber,
        trips: 0,
        invoices: 0,
        sales: 0,
        collections: 0,
        loaded: 0,
        returned: 0,
        expectedSold: 0
      };
    current.trips += 1;
    current.loaded += trip.items.reduce((sum, item) => sum + item.quantityLoaded, 0);
    current.returned += trip.items.reduce((sum, item) => sum + (item.quantityReturned ?? 0), 0);
    current.expectedSold = current.loaded - current.returned;
    vehicleMap.set(trip.vehicleId, current);
  }

  for (const invoice of invoices) {
    const shopCurrent =
      shopMap.get(invoice.shopId) ??
      { shop: invoice.shop.name, invoices: 0, value: 0, paid: 0, remaining: 0 };
    const invoiceTotal = Number(invoice.totalAmount);
    const paid = invoice.allocations
      .filter((allocation) => paymentCountsTowardBalance(allocation.payment))
      .reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    shopCurrent.invoices += 1;
    shopCurrent.value += invoiceTotal;
    shopCurrent.paid += paid;
    shopCurrent.remaining += Math.max(0, invoiceTotal - paid);
    shopMap.set(invoice.shopId, shopCurrent);

    if (invoice.trip) {
      const vehicleCurrent =
        vehicleMap.get(invoice.trip.vehicleId) ??
        {
          vehicle: invoice.trip.vehicle.nameOrNumber,
          trips: 0,
          invoices: 0,
          sales: 0,
          collections: 0,
          loaded: 0,
          returned: 0,
          expectedSold: 0
        };
      vehicleCurrent.invoices += 1;
      vehicleCurrent.sales += invoiceTotal;
      vehicleCurrent.collections += paid;
      vehicleMap.set(invoice.trip.vehicleId, vehicleCurrent);
    }

    for (const item of invoice.items) {
      const key = item.productId;
      const current =
        productMap.get(key) ??
        {
          product: `${item.product.name} ${item.product.measurement}`,
          supplier: item.product.supplier.name,
          quantity: 0,
          value: 0
        };
      current.quantity += item.quantity;
      current.value += Number(item.lineTotal);
      productMap.set(key, current);
    }
  }

  const vehicleRows = Array.from(vehicleMap.values()).sort((a, b) => b.sales - a.sales);
  const topVehicleSales = vehicleRows[0]?.sales ?? 0;

  return {
    selected,
    label: monthLabel(selected),
    invoices,
    payments,
    trips: trips.map((trip) => {
      const loaded = trip.items.reduce((sum, item) => sum + item.quantityLoaded, 0);
      const returned = trip.items.reduce((sum, item) => sum + (item.quantityReturned ?? 0), 0);
      return {
        id: trip.id,
        date: displayDate(trip.tripDate),
        vehicle: trip.vehicle.nameOrNumber,
        supplier: trip.supplier?.name ?? "Mixed",
        loaded,
        returned,
        expectedSold: loaded - returned,
        invoiceValue: trip.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
        status: trip.status
      };
    }),
    stockReceived,
    productRows: Array.from(productMap.values()).sort((a, b) => b.value - a.value),
    shopRows: Array.from(shopMap.values()).sort((a, b) => b.value - a.value),
    vehicleRows: vehicleRows.map((vehicle, index) => ({
      ...vehicle,
      rank: index + 1,
      differenceFromTop: topVehicleSales - vehicle.sales,
      salesPercent: topVehicleSales > 0 ? (vehicle.sales / topVehicleSales) * 100 : 0
    })),
    totals: {
      invoiceValue,
      collectionValue,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      tripCount: trips.length,
      shopCount: shopMap.size,
      stockReceivedUnits: stockReceived.reduce((sum, batch) => sum + batch.quantity, 0),
      pendingChequeValue: payments
        .filter((payment) => payment.method === "cheque" && payment.chequeStatus === "pending")
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
      totalOutstanding
    }
  };
}
