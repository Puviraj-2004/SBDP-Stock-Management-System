import { InvoicesTable } from "@/components/InvoicesTable";
import { ExportButton } from "@/components/ExportButton";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money, toDateInputValue } from "@/lib/dates";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { shop: true, trip: { include: { vehicle: true } }, _count: { select: { allocations: true, items: true } } },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    take: 300
  });

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
    </>
  );
}
