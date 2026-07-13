import { StockTable } from "@/components/StockTable";
import { ExportButton } from "@/components/ExportButton";
import { PaginationControls } from "@/components/PaginationControls";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { inTwoMonths, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

const allPostedMovementsDate = new Date(Date.UTC(9999, 11, 31));

export default async function StockPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const today = startOfToday();
  const soon = inTwoMonths();

  const [batches, totalBatches] = await Promise.all([
    prisma.productBatch.findMany({
      include: {
        product: { include: { supplier: true } },
        _count: { select: { loadItems: true, returnItems: true, invoiceItems: true, ledgerEntries: true } }
      },
      orderBy: [{ expiryDate: "asc" }, { product: { name: "asc" } }],
      ...getPagination(page)
    }),
    prisma.productBatch.count()
  ]);

  const warehouseBalances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id), allPostedMovementsDate);
  const totalUnits = batches.reduce((sum, batch) => sum + (warehouseBalances.get(batch.id) ?? 0), 0);
  const rows = batches.map((batch) => ({
    id: batch.id,
    productName: batch.product.name,
    measurement: batch.product.measurement,
    supplierName: batch.product.supplier.name,
    barcode: batch.product.barcode,
    itemCode: batch.product.itemCode,
    receivedQuantity: batch.receivedQuantity,
    warehouseBalance: warehouseBalances.get(batch.id) ?? 0,
    costPriceLabel: money(batch.costPrice),
    receivedDate: toDateInputValue(batch.receivedDate),
    expiryDate: toDateInputValue(batch.expiryDate),
    movementCount: batch._count.loadItems + batch._count.returnItems + batch._count.invoiceItems + batch._count.ledgerEntries
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
      <div className="mt-4">
        <PaginationControls
          pathname="/stock"
          page={page}
          pageCount={getPageCount(totalBatches)}
          total={totalBatches}
          pageSize={DEFAULT_PAGE_SIZE}
        />
      </div>
    </>
  );
}
