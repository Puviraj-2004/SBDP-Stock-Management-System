import { Prisma } from "@prisma/client";
import type { PaymentMethod, ChequeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

type LedgerPayment = {
  amount: unknown;
  method: PaymentMethod;
  chequeStatus: ChequeStatus | null;
};

export function paymentCountsTowardBalance(payment: Pick<LedgerPayment, "method" | "chequeStatus">) {
  return (
    payment.method === "cash" ||
    payment.method === "bank_transfer" ||
    (payment.method === "cheque" && payment.chequeStatus === "cleared")
  );
}

export const countedPaymentWhere = {
  OR: [
    { method: "cash" },
    { method: "bank_transfer" },
    { method: "cheque", chequeStatus: "cleared" }
  ]
} satisfies Prisma.PaymentWhereInput;

export function calculateOutstandingBalance(
  invoiceTotals: unknown[],
  payments: LedgerPayment[]
) {
  const invoiced = invoiceTotals.reduce<number>((sum, total) => sum + Number(total ?? 0), 0);
  const paid = payments
    .filter(paymentCountsTowardBalance)
    .reduce<number>((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return invoiced - paid;
}

export async function getShopOutstandingBalance(shopId: string) {
  const [invoiceTotals, payments] = await Promise.all([
    prisma.invoice.findMany({ where: { shopId }, select: { totalAmount: true } }),
    prisma.payment.findMany({
      where: { shopId },
      select: { amount: true, method: true, chequeStatus: true }
    })
  ]);

  return calculateOutstandingBalance(
    invoiceTotals.map((invoice) => invoice.totalAmount),
    payments
  );
}

export async function getOutstandingBalancesByShop(shopIds: string[]) {
  if (shopIds.length === 0) return new Map<string, number>();

  const [invoiceTotals, paymentTotals] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["shopId"],
      where: { shopId: { in: shopIds } },
      _sum: { totalAmount: true }
    }),
    prisma.payment.groupBy({
      by: ["shopId"],
      where: {
        shopId: { in: shopIds },
        ...countedPaymentWhere
      },
      _sum: { amount: true }
    })
  ]);

  const balances = new Map(shopIds.map((shopId) => [shopId, 0]));

  for (const row of invoiceTotals) {
    balances.set(row.shopId, (balances.get(row.shopId) ?? 0) + Number(row._sum.totalAmount ?? 0));
  }

  for (const row of paymentTotals) {
    balances.set(row.shopId, (balances.get(row.shopId) ?? 0) - Number(row._sum.amount ?? 0));
  }

  return balances;
}

export async function getInvoicePaidAmount(invoiceId: string) {
  const allocations = await prisma.paymentAllocation.findMany({
    where: { invoiceId },
    select: {
      amount: true,
      payment: { select: { method: true, chequeStatus: true } }
    }
  });

  return allocations
    .filter((allocation) => paymentCountsTowardBalance(allocation.payment))
    .reduce((sum, allocation) => sum + Number(allocation.amount), 0);
}

export async function refreshInvoicePaidStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { totalAmount: true }
  });
  if (!invoice) return;

  const paid = await getInvoicePaidAmount(invoiceId);
  const total = Number(invoice.totalAmount);
  const paidStatus = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidStatus }
  });
}
