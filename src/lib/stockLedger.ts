import { Prisma, PrismaClient, StockTransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";

type DbClient = PrismaClient | Prisma.TransactionClient;

const movementTypes = [
  StockTransactionType.load,
  StockTransactionType.return_to_warehouse
];

export async function getWarehouseBalancesByBatchIds(
  batchIds: string[],
  asOfDate: Date = new Date(),
  db: DbClient = prisma
) {
  if (batchIds.length === 0) return new Map<string, number>();

  const [batches, movements] = await Promise.all([
    db.productBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, receivedQuantity: true }
    }),
    db.vehicleStockLedger.groupBy({
      by: ["batchId", "transactionType"],
      where: {
        batchId: { in: batchIds },
        transactionType: { in: movementTypes },
        transactionDate: { lte: asOfDate }
      },
      _sum: { quantityChange: true }
    })
  ]);

  const balances = new Map(batches.map((batch) => [batch.id, batch.receivedQuantity]));

  for (const row of movements) {
    const current = balances.get(row.batchId) ?? 0;
    const quantity = row._sum.quantityChange ?? 0;

    if (row.transactionType === StockTransactionType.load) {
      balances.set(row.batchId, current - quantity);
    }

    if (row.transactionType === StockTransactionType.return_to_warehouse) {
      balances.set(row.batchId, current + Math.abs(quantity));
    }
  }

  return balances;
}

export async function getCompanyStockByProductIds(
  productIds: string[],
  asOfDate: Date = new Date(),
  db: DbClient = prisma
) {
  if (productIds.length === 0) return new Map<string, number>();

  const [receivedTotals, ledgerTotals] = await Promise.all([
    db.productBatch.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { receivedQuantity: true }
    }),
    db.vehicleStockLedger.groupBy({
      by: ["productId", "transactionType"],
      where: {
        productId: { in: productIds },
        transactionType: {
          in: [StockTransactionType.sale, StockTransactionType.adjustment]
        },
        transactionDate: { lte: asOfDate }
      },
      _sum: { quantityChange: true }
    })
  ]);

  const totals = new Map<string, number>();

  for (const row of receivedTotals) {
    totals.set(row.productId, row._sum.receivedQuantity ?? 0);
  }

  for (const row of ledgerTotals) {
    totals.set(row.productId, (totals.get(row.productId) ?? 0) + (row._sum.quantityChange ?? 0));
  }

  return totals;
}

export async function getVehicleStockRows(vehicleId: string, asOfDate: Date = new Date(), db: DbClient = prisma) {
  const rows = await db.vehicleStockLedger.groupBy({
    by: ["productId", "batchId"],
    where: {
      vehicleId,
      transactionDate: { lte: asOfDate }
    },
    _sum: { quantityChange: true }
  });

  const positiveRows = rows
    .map((row) => ({
      productId: row.productId,
      batchId: row.batchId,
      balance: row._sum.quantityChange ?? 0
    }))
    .filter((row) => row.balance > 0);

  const batches = await db.productBatch.findMany({
    where: { id: { in: positiveRows.map((row) => row.batchId) } },
    include: { product: { include: { supplier: true } } },
    orderBy: [{ product: { name: "asc" } }, { expiryDate: "asc" }]
  });
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));

  return positiveRows.flatMap((row) => {
    const batch = batchById.get(row.batchId);
    if (!batch) return [];
    return [{
      productId: row.productId,
      batchId: row.batchId,
      productName: batch.product.name,
      measurement: batch.product.measurement,
      supplierName: batch.product.supplier.name,
      barcode: batch.product.barcode,
      itemCode: batch.product.itemCode,
      sellingPrice: batch.product.sellingPrice,
      expiryDate: batch.expiryDate,
      balance: row.balance
    }];
  });
}
