import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function paymentCounts(payment: { method: string; chequeStatus: string | null }) {
  return (
    payment.method === "cash" ||
    payment.method === "bank_transfer" ||
    (payment.method === "cheque" && payment.chequeStatus === "cleared")
  );
}

async function getInvoiceUnallocatedAmount(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
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

async function allocateToInvoice(paymentId: string, invoiceId: string, availableAmount: number) {
  if (availableAmount <= 0) return 0;

  const remainingInvoiceAmount = await getInvoiceUnallocatedAmount(invoiceId);
  const allocationAmount = Math.min(availableAmount, remainingInvoiceAmount);
  if (allocationAmount <= 0) return 0;

  await prisma.paymentAllocation.create({
    data: {
      paymentId,
      invoiceId,
      amount: new Prisma.Decimal(allocationAmount)
    }
  });

  return allocationAmount;
}

async function refreshInvoicePaidStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      totalAmount: true,
      allocations: {
        select: {
          amount: true,
          payment: { select: { method: true, chequeStatus: true } }
        }
      }
    }
  });
  if (!invoice) return;

  const paid = invoice.allocations
    .filter((allocation) => paymentCounts(allocation.payment))
    .reduce((sum, allocation) => sum + Number(allocation.amount), 0);
  const total = Number(invoice.totalAmount);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidStatus: paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial" }
  });
}

async function main() {
  const affectedInvoiceIds = new Set<string>();

  await prisma.paymentAllocation.deleteMany({
    where: {
      payment: {
        method: "cheque",
        chequeStatus: "pending"
      }
    }
  });

  const payments = await prisma.payment.findMany({
    where: { allocations: { none: {} } },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    include: { allocations: true }
  });

  for (const payment of payments) {
    if (!paymentCounts(payment)) continue;

    let remainingPaymentAmount = Number(payment.amount);

    if (payment.invoiceId) {
      const allocated = await allocateToInvoice(payment.id, payment.invoiceId, remainingPaymentAmount);
      if (allocated > 0) {
        remainingPaymentAmount -= allocated;
        affectedInvoiceIds.add(payment.invoiceId);
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: { shopId: payment.shopId },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      select: { id: true }
    });

    for (const invoice of invoices) {
      if (invoice.id === payment.invoiceId) continue;

      const allocated = await allocateToInvoice(payment.id, invoice.id, remainingPaymentAmount);
      if (allocated > 0) {
        remainingPaymentAmount -= allocated;
        affectedInvoiceIds.add(invoice.id);
      }
      if (remainingPaymentAmount <= 0) break;
    }
  }

  const invoices = await prisma.invoice.findMany({ select: { id: true } });
  invoices.forEach((invoice) => affectedInvoiceIds.add(invoice.id));

  for (const invoiceId of affectedInvoiceIds) {
    await refreshInvoicePaidStatus(invoiceId);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
