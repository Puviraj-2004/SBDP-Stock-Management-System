import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/dates";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

export async function getFifoBatchSuggestion(productId: string) {
  const batches = await prisma.productBatch.findMany({
    where: {
      productId,
      expiryDate: { gte: startOfToday() }
    },
    orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }]
  });
  const balances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id));
  return batches.find((batch) => (balances.get(batch.id) ?? 0) > 0) ?? null;
}

export async function getAvailableBatches(productId: string) {
  const batches = await prisma.productBatch.findMany({
    where: {
      productId,
      expiryDate: { gte: startOfToday() }
    },
    orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }],
    include: { product: { include: { supplier: true } } }
  });
  const balances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id));
  return batches.filter((batch) => (balances.get(batch.id) ?? 0) > 0);
}
