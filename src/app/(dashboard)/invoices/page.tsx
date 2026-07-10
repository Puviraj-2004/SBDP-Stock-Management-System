import { InvoicesTable } from "@/components/InvoicesTable";
import { ExportButton } from "@/components/ExportButton";
import { PaginationControls } from "@/components/PaginationControls";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money, toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [invoices, totalInvoices] = await Promise.all([
    prisma.invoice.findMany({
      include: { shop: true, trip: { include: { vehicle: true } }, _count: { select: { allocations: true, items: true } } },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      ...getPagination(page)
    }),
    prisma.invoice.count()
  ]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Create, review, edit unpaid invoices, and record payments."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton href="/api/exports/invoices">Export Excel</ExportButton>
            <LinkButton href="/invoices/new">Create invoice</LinkButton>
          </div>
        }
      />
      <InvoicesTable
        rows={invoices.map((invoice) => ({
          id: invoice.id,
          date: toDateInputValue(invoice.invoiceDate),
          shopName: invoice.shop.name,
          tripLabel: invoice.trip ? `${displayDate(invoice.trip.tripDate)} - ${invoice.trip.vehicle.nameOrNumber}` : "-",
          itemCount: invoice._count.items,
          amountLabel: money(invoice.totalAmount),
          allocationCount: invoice._count.allocations,
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
