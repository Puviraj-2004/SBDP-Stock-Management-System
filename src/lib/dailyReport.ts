import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, startOfToday, toDateInputValue } from "@/lib/dates";
import { paymentCountsTowardBalance } from "@/lib/balance";

export function dateRangeFromInput(value?: string) {
  const selected = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateInputValue(startOfToday());
  const start = dateInputToDate(selected);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { selected, start, end };
}

export async function getDailyProgress(date?: string) {
  const { selected, start, end } = dateRangeFromInput(date);
  const selectedDate = dateInputToDate(selected);
  const nearExpiryEnd = new Date(selectedDate);
  nearExpiryEnd.setUTCDate(nearExpiryEnd.getUTCDate() + 60);
  const overdueCutoff = new Date(selectedDate);
  overdueCutoff.setUTCDate(overdueCutoff.getUTCDate() - 30);

  const [trips, invoices, payments, stockReceived, nearExpiryBatches, openTrips, pendingCheques, partialInvoices, overdueInvoices, shopsToday, allInvoices, allPayments] = await Promise.all([
    prisma.loadingTrip.findMany({
      where: { tripDate: { gte: start, lt: end } },
      include: {
        vehicle: true,
        supplier: true,
        items: { include: { batch: { include: { product: true } } } },
        invoices: { include: { items: true } }
      },
      orderBy: [{ tripDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.invoice.findMany({
      where: { invoiceDate: { gte: start, lt: end } },
      include: {
        shop: true,
        items: { include: { product: true } },
        _count: { select: { items: true, allocations: true } }
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lt: end } },
      include: {
        shop: true,
        allocations: { include: { invoice: { include: { shop: true } } } }
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.productBatch.findMany({
      where: { receivedDate: { gte: start, lt: end } },
      include: { product: { include: { supplier: true } } },
      orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.productBatch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { gte: selectedDate, lte: nearExpiryEnd }
      },
      include: { product: true },
      orderBy: { expiryDate: "asc" },
      take: 20
    }),
    prisma.loadingTrip.findMany({
      where: { status: "loaded" },
      include: { vehicle: true },
      orderBy: [{ tripDate: "asc" }, { createdAt: "asc" }],
      take: 20
    }),
    prisma.payment.findMany({
      where: { method: "cheque", chequeStatus: "pending" },
      include: { shop: true },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
      take: 20
    }),
    prisma.invoice.findMany({
      where: { paidStatus: "partial" },
      include: { shop: true },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      take: 20
    }),
    prisma.invoice.findMany({
      where: { paidStatus: "unpaid", invoiceDate: { lt: overdueCutoff } },
      include: { shop: true },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      take: 20
    }),
    prisma.shop.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      take: 20
    }),
    prisma.invoice.findMany({ select: { totalAmount: true } }),
    prisma.payment.findMany({ select: { amount: true, method: true, chequeStatus: true } })
  ]);

  const tripRows = trips.map((trip) => {
    const loaded = trip.items.reduce((sum, item) => sum + item.quantityLoaded, 0);
    const returned = trip.items.reduce((sum, item) => sum + (item.quantityReturned ?? 0), 0);
    const expectedSold = loaded - returned;
    const invoiceValue = trip.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
    const expectedByProduct = new Map<string, number>();
    const billedByProduct = new Map<string, number>();

    for (const item of trip.items) {
      const current = expectedByProduct.get(item.batch.productId) ?? 0;
      expectedByProduct.set(item.batch.productId, current + item.quantityLoaded - (item.quantityReturned ?? 0));
    }

    for (const invoice of trip.invoices) {
      for (const item of invoice.items) {
        const current = billedByProduct.get(item.productId) ?? 0;
        billedByProduct.set(item.productId, current + item.quantity);
      }
    }

    const productIds = new Set([...expectedByProduct.keys(), ...billedByProduct.keys()]);
    const mismatchCount = Array.from(productIds).filter(
      (productId) => (expectedByProduct.get(productId) ?? 0) !== (billedByProduct.get(productId) ?? 0)
    ).length;

    return {
      id: trip.id,
      vehicle: trip.vehicle.nameOrNumber,
      supplier: trip.supplier?.name ?? "Mixed",
      status: trip.status,
      itemCount: trip.items.length,
      loaded,
      returned,
      expectedSold,
      invoiceCount: trip.invoices.length,
      invoiceValue,
      mismatchCount
    };
  });

  const countedPayments = payments.filter(paymentCountsTowardBalance);
  const todayPendingCheques = payments.filter((payment) => payment.method === "cheque" && payment.chequeStatus === "pending");
  const allCountedPayments = allPayments.filter(paymentCountsTowardBalance);
  const totalOutstanding =
    allInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) -
    allCountedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const tripMismatchAlerts = tripRows.filter((trip) => trip.mismatchCount > 0);

  return {
    selected,
    trips: tripRows,
    invoices,
    payments,
    stockReceived,
    alerts: [
      ...nearExpiryBatches.map((batch) => ({
        id: `near-expiry-${batch.id}`,
        severity: "danger" as const,
        message: `${batch.product.name} ${batch.product.measurement} expires soon`,
        meta: displayDate(batch.expiryDate)
      })),
      ...tripMismatchAlerts.map((trip) => ({
        id: `trip-mismatch-${trip.id}`,
        severity: "danger" as const,
        message: `${trip.vehicle} trip has ${trip.mismatchCount} reconciliation issue${trip.mismatchCount === 1 ? "" : "s"}`,
        meta: "View trip",
        href: `/trips/${trip.id}`
      })),
      ...overdueInvoices.map((invoice) => ({
        id: `overdue-${invoice.id}`,
        severity: "danger" as const,
        message: `${invoice.shop.name} invoice is unpaid over 30 days`,
        meta: displayDate(invoice.invoiceDate),
        href: `/invoices/${invoice.id}`
      })),
      ...openTrips.map((trip) => ({
        id: `open-trip-${trip.id}`,
        severity: "warning" as const,
        message: `${trip.vehicle.nameOrNumber} has an open trip`,
        meta: displayDate(trip.tripDate),
        href: `/trips/${trip.id}`
      })),
      ...pendingCheques.map((payment) => ({
        id: `pending-cheque-${payment.id}`,
        severity: "warning" as const,
        message: `${payment.shop.name} cheque is pending`,
        meta: displayDate(payment.paymentDate)
      })),
      ...partialInvoices.map((invoice) => ({
        id: `partial-${invoice.id}`,
        severity: "warning" as const,
        message: `${invoice.shop.name} invoice is partially paid`,
        meta: displayDate(invoice.invoiceDate),
        href: `/invoices/${invoice.id}`
      })),
      ...stockReceived.map((batch) => ({
        id: `stock-received-${batch.id}`,
        severity: "info" as const,
        message: `${batch.product.name} stock received today`,
        meta: `${batch.quantity} units`
      })),
      ...shopsToday.map((shop) => ({
        id: `new-shop-${shop.id}`,
        severity: "info" as const,
        message: `${shop.name} added as a new shop`,
        meta: "Today"
      }))
    ].slice(0, 40),
    totals: {
      trips: trips.length,
      openTrips: trips.filter((trip) => trip.status === "loaded").length,
      closedTrips: trips.filter((trip) => trip.status === "closed").length,
      loaded: tripRows.reduce((sum, trip) => sum + trip.loaded, 0),
      returned: tripRows.reduce((sum, trip) => sum + trip.returned, 0),
      expectedSold: tripRows.reduce((sum, trip) => sum + trip.expectedSold, 0),
      invoices: invoices.length,
      invoiceValue: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
      payments: payments.length,
      countedPaymentValue: countedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      pendingChequeValue: todayPendingCheques.reduce((sum, payment) => sum + Number(payment.amount), 0),
      stockReceived: stockReceived.length,
      stockReceivedUnits: stockReceived.reduce((sum, batch) => sum + batch.quantity, 0),
      totalOutstanding
    }
  };
}
