import { StockTable } from "@/components/StockTable";
import { PaginationControls } from "@/components/PaginationControls";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { inTwoMonths, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";
import type { Prisma } from "@prisma/client";

const allPostedMovementsDate = new Date(Date.UTC(9999, 11, 31));

export default async function StockPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; q?: string; state?: string }>;
}) {
  const { page: pageParam, q: queryParam, state: stateParam } = await searchParams;
  const page = parsePage(pageParam);
  const query = queryParam ?? "";
  const state = ["available", "expiring", "expired"].includes(stateParam ?? "") ? stateParam! : "";
  const today = startOfToday();
  const soon = inTwoMonths();

  const tokens = query.trim().replace(/\s+/g, " ").toLowerCase().split(" ").filter(Boolean);
  const searchWhere: Prisma.ProductBatchWhereInput = tokens.length
    ? {
        AND: tokens.map((token) => ({
          OR: [
            { product: { name: { contains: token, mode: "insensitive" } } },
            { product: { measurement: { contains: token, mode: "insensitive" } } },
            { product: { supplier: { name: { contains: token, mode: "insensitive" } } } },
            { product: { barcode: { contains: token, mode: "insensitive" } } },
            { product: { itemCode: { contains: token, mode: "insensitive" } } }
          ]
        }))
      }
    : {};

  const batchQuery = {
    where: searchWhere,
    include: {
      product: { include: { supplier: true } },
      _count: { select: { loadItems: true, returnItems: true, invoiceItems: true, ledgerEntries: true } }
    },
    orderBy: [{ expiryDate: "asc" as const }, { product: { name: "asc" as const } }]
  };

  const allMatchCount = await prisma.productBatch.count({ where: searchWhere });
  const pageCount = getPageCount(allMatchCount);
  const currentPage = Math.min(page, pageCount);
  const needsGlobalFiltering = Boolean(tokens.length || state);
  const matchingBatches = await prisma.productBatch.findMany({
    ...batchQuery,
    ...(needsGlobalFiltering ? {} : getPagination(currentPage))
  });

  const productSummaries = tokens.length
    ? await (async () => {
        const products = new Map(matchingBatches.map((batch) => [batch.productId, {
          productName: `${batch.product.name} ${batch.product.measurement}`,
          supplierName: batch.product.supplier.name
        }]));
        const productIds = Array.from(products.keys());
        if (productIds.length === 0) return [];

        const totals = await prisma.productBatch.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _sum: { receivedQuantity: true }
        });
        const totalByProductId = new Map(totals.map((row) => [row.productId, row._sum.receivedQuantity ?? 0]));

        return Array.from(products, ([productId, product]) => ({
          productId,
          ...product,
          receivedQuantity: totalByProductId.get(productId) ?? 0
        })).sort((a, b) => a.productName.localeCompare(b.productName) || a.supplierName.localeCompare(b.supplierName));
      })()
    : [];

  const allBalances = await getWarehouseBalancesByBatchIds(
    matchingBatches.map((batch) => batch.id),
    allPostedMovementsDate
  );
  const stateFilteredBatches = matchingBatches.filter((batch) => {
    const expired = toDateInputValue(batch.expiryDate) < toDateInputValue(today);
    const expiring = !expired && toDateInputValue(batch.expiryDate) <= toDateInputValue(soon);
    const balance = allBalances.get(batch.id) ?? 0;
    return !state ||
      (state === "available" && balance > 0 && !expired) ||
      (state === "expiring" && balance > 0 && expiring) ||
      (state === "expired" && balance > 0 && expired);
  });
  const totalBatches = state ? stateFilteredBatches.length : allMatchCount;
  const filteredPageCount = getPageCount(totalBatches);
  const visiblePage = Math.min(currentPage, filteredPageCount);
  const pagination = getPagination(visiblePage);
  const batches = needsGlobalFiltering
    ? stateFilteredBatches.slice(pagination.skip, pagination.skip + pagination.take)
    : stateFilteredBatches;

  /*
   * Search/state filtering happens before pagination so a matching batch on
   * any page can be found. Balances are derived from the existing ledger;
   * this only reads stock data and does not change inventory.
   */
  const currentPageBatches = batches;

  const warehouseBalances = new Map(currentPageBatches.map((batch) => [batch.id, allBalances.get(batch.id) ?? 0]));
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
            <LinkButton href="/stock/receive">Receive stock</LinkButton>
          </div>
        }
      />
      <StockTable
        rows={rows}
        productSummaries={productSummaries}
        today={toDateInputValue(today)}
        soon={toDateInputValue(soon)}
        query={query}
        state={state}
      />
      <div className="mt-4">
        <PaginationControls
          pathname="/stock"
          page={visiblePage}
          pageCount={filteredPageCount}
          total={totalBatches}
          pageSize={DEFAULT_PAGE_SIZE}
          params={{ q: query, state }}
        />
      </div>
    </>
  );
}
