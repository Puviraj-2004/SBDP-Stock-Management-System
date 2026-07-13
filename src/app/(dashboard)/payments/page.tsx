import { PaymentsWorkPage } from "@/components/PaymentsWorkPage";
import { PaymentsFilterBar } from "@/components/PaymentsFilterBar";
import { PaginationControls } from "@/components/PaginationControls";
import { PageHeader } from "@/components/ui";
import { getInvoicePaidAmount, paymentCountsTowardBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

function invoiceLabel(invoice: {
  invoiceType: "sale" | "opening";
  invoiceDate: Date;
  referenceNumber: string | null;
}) {
  if (invoice.invoiceType === "opening") {
    return invoice.referenceNumber ? `Old invoice ${invoice.referenceNumber}` : `Old invoice ${displayDate(invoice.invoiceDate)}`;
  }
  return `Invoice ${displayDate(invoice.invoiceDate)}`;
}

function paymentWhere({
  method,
  from,
  to,
  shop
}: {
  method?: string;
  from?: string;
  to?: string;
  shop?: string;
}) {
  const where: Prisma.PaymentWhereInput = {};

  if (method === "cash" || method === "bank_transfer" || method === "cheque") {
    where.method = method;
  }

  if (from || to) {
    where.paymentDate = {
      ...(from ? { gte: dateInputToDate(from) } : {}),
      ...(to ? { lte: dateInputToDate(to) } : {})
    };
  }

  if (shop?.trim()) {
    where.shop = {
      name: {
        contains: shop.trim(),
        mode: "insensitive"
      }
    };
  }

  return where;
}

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; method?: string; from?: string; to?: string; shop?: string }>;
}) {
  const { page: pageParam, method = "", from = "", to = "", shop = "" } = await searchParams;
  const page = parsePage(pageParam);
  const where = paymentWhere({ method, from, to, shop });

  const [payments, totalPayments, pendingCheques, shops, openInvoices] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        shop: true,
        allocations: {
          include: {
            invoice: {
              include: {
                allocations: {
                  include: {
                    payment: { select: { method: true, chequeStatus: true } }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      ...getPagination(page)
    }),
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where: { method: "cheque", chequeStatus: "pending" },
      include: { shop: true },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.shop.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.invoice.findMany({
      where: { paidStatus: { in: ["unpaid", "partial"] } },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        shopId: true,
        invoiceType: true,
        invoiceDate: true,
        referenceNumber: true,
        totalAmount: true
      }
    })
  ]);

  const invoiceOptions = (
    await Promise.all(
      openInvoices.map(async (invoice) => {
        const paid = await getInvoicePaidAmount(invoice.id);
        const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
        if (remaining <= 0) return null;
        return {
          id: invoice.id,
          shopId: invoice.shopId,
          label: invoiceLabel(invoice),
          dateLabel: displayDate(invoice.invoiceDate),
          remaining
        };
      })
    )
  ).filter((invoice): invoice is NonNullable<typeof invoice> => Boolean(invoice));

  return (
    <>
      <PageHeader
        title="Payments"
        description="Daily payment review, pending cheques, and shop payment allocation."
      />

      <PaymentsFilterBar method={method} from={from} to={to} shop={shop} />

      <PaymentsWorkPage
        pendingCheques={pendingCheques.map((payment) => ({
          id: payment.id,
          paymentDate: toDateInputValue(payment.paymentDate),
          shopName: payment.shop.name,
          chequeNumber: payment.chequeNumber ?? "-",
          amount: String(payment.amount)
        }))}
        payments={payments.map((payment) => ({
          id: payment.id,
          paymentDate: toDateInputValue(payment.paymentDate),
          shopName: payment.shop.name,
          amount: String(payment.amount),
          method: payment.method,
          chequeStatus: payment.chequeStatus,
          allocations: payment.allocations.map((allocation) => {
            const paidBeforeThisAllocation = allocation.invoice.allocations
              .filter((invoiceAllocation) => invoiceAllocation.id !== allocation.id)
              .filter((invoiceAllocation) => paymentCountsTowardBalance(invoiceAllocation.payment))
              .reduce((sum, invoiceAllocation) => sum + Number(invoiceAllocation.amount), 0);
            const remainingBeforeThisAllocation = Math.max(0, Number(allocation.invoice.totalAmount) - paidBeforeThisAllocation);

            return {
              id: allocation.id,
              invoiceId: allocation.invoiceId,
              label: invoiceLabel(allocation.invoice),
              amount: String(allocation.amount),
              isFull: Number(allocation.amount) >= remainingBeforeThisAllocation
            };
          })
        }))}
        shops={shops}
        invoices={invoiceOptions}
        today={toDateInputValue(new Date())}
      />

      <div className="mt-4">
        <PaginationControls
          pathname="/payments"
          page={page}
          pageCount={getPageCount(totalPayments)}
          total={totalPayments}
          pageSize={DEFAULT_PAGE_SIZE}
          params={{ method, from, to, shop }}
        />
      </div>
    </>
  );
}
