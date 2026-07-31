import Link from "next/link";
import { AlertTriangle, Eye } from "lucide-react";
import { InvoicesTable } from "@/components/InvoicesTable";
import { PaginationControls } from "@/components/PaginationControls";
import { Badge, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const overdueCutoff = startOfToday();
  overdueCutoff.setUTCDate(overdueCutoff.getUTCDate() - 30);
  const [invoices, totalInvoices, overdueInvoices] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        shop: true,
        vehicle: true,
        allocations: { select: { paymentId: true } },
        payments: { select: { id: true } },
        _count: { select: { items: true } }
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      ...getPagination(page)
    }),
    prisma.invoice.count(),
    prisma.invoice.findMany({
      where: {
        invoiceDate: { lt: overdueCutoff },
        paidStatus: { in: ["unpaid", "partial"] }
      },
      include: {
        shop: true,
        vehicle: true,
        allocations: { select: { paymentId: true } },
        payments: { select: { id: true } },
        _count: { select: { items: true } }
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      take: 10
    })
  ]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Create, review, edit unpaid invoices, and follow old unpaid balances."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/invoices/new">Create invoice</LinkButton>
          </div>
        }
      />
      {overdueInvoices.length > 0 ? (
        <Panel className="mb-5 border-amber-300 bg-amber-50">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-700" />
              <h2 className="font-semibold text-amber-950">Older than 30 days</h2>
              <Badge tone="amber">{overdueInvoices.length} open</Badge>
            </div>
            <div className="text-sm font-medium text-amber-800">
              Oldest first
            </div>
          </div>
          <Table headers={["Date", "Shop", "Source", "Amount", "Status", "Action"]}>
            {overdueInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-3 py-2 tabular">{displayDate(invoice.invoiceDate)}</td>
                <td className="px-3 py-2 font-medium">{invoice.shop.name}</td>
                <td className="px-3 py-2">
                  {invoice.invoiceType === "opening"
                    ? invoice.referenceNumber
                      ? `Old invoice - ${invoice.referenceNumber}`
                      : "Old invoice"
                    : invoice.vehicle?.nameOrNumber ?? "-"}
                </td>
                <td className="px-3 py-2 tabular">{money(invoice.totalAmount)}</td>
                <td className="px-3 py-2">
                  <Badge tone={invoice.paidStatus === "partial" ? "amber" : "red"}>{invoice.paidStatus}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                    title="View invoice"
                    aria-label="View invoice"
                  >
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : null}
      <InvoicesTable
        rows={invoices.map((invoice) => ({
          id: invoice.id,
          date: toDateInputValue(invoice.invoiceDate),
          shopName: invoice.shop.name,
          invoiceType: invoice.invoiceType,
          referenceNumber: invoice.referenceNumber,
          sourceLabel: invoice.invoiceType === "opening"
            ? "Old invoice"
            : invoice.vehicle
              ? invoice.vehicle.nameOrNumber
              : "-",
          itemCount: invoice._count.items,
          amountLabel: money(invoice.totalAmount),
          paymentCount: new Set([
            ...invoice.allocations.map((allocation) => allocation.paymentId),
            ...invoice.payments.map((payment) => payment.id)
          ]).size,
          paidStatus: invoice.paidStatus
        }))}
      />
      <div className="mt-4">
        <PaginationControls
          pathname="/invoices"
          page={page}
          pageCount={getPageCount(totalInvoices)}
          total={totalInvoices}
          pageSize={DEFAULT_PAGE_SIZE}
        />
      </div>
    </>
  );
}
