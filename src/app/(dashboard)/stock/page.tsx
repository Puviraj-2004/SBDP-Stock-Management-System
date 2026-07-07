import { StockTable } from "@/components/StockTable";
import { ExportButton } from "@/components/ExportButton";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { inTwoMonths, startOfToday, toDateInputValue } from "@/lib/dates";

export default async function StockPage() {
  const today = startOfToday();
  const soon = inTwoMonths();

  const batches = await prisma.productBatch.findMany({
    include: {
      product: { include: { supplier: true } },
      _count: { select: { tripItems: true } }
    },
    orderBy: [{ expiryDate: "asc" }, { product: { name: "asc" } }],
    take: 300
  });

  const totalUnits = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  const rows = batches.map((batch) => ({
    id: batch.id,
    productName: batch.product.name,
    measurement: batch.product.measurement,
    supplierName: batch.product.supplier.name,
    barcode: batch.product.barcode,
    itemCode: batch.product.itemCode,
    quantity: batch.quantity,
    receivedDate: toDateInputValue(batch.receivedDate),
    expiryDate: toDateInputValue(batch.expiryDate),
    tripItemCount: batch._count.tripItems
  }));

  return (
    <>
      <PageHeader
        title="Stock list"
        description={`${batches.length} batches shown - ${totalUnits} units total`}
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton href="/api/exports/stock">Export Excel</ExportButton>
            <LinkButton href="/stock/receive">Receive stock</LinkButton>
          </div>
        }
      />
      <StockTable rows={rows} today={toDateInputValue(today)} soon={toDateInputValue(soon)} />
    </>
  );
}
