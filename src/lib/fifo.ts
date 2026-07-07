import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/dates";

export async function getFifoBatchSuggestion(productId: string) {
  return prisma.productBatch.findFirst({
    where: {
      productId,
      quantity: { gt: 0 },
      expiryDate: { gte: startOfToday() }
    },
    orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }]
  });
}

export async function getAvailableBatches(productId: string) {
  return prisma.productBatch.findMany({
    where: {
      productId,
      quantity: { gt: 0 },
      expiryDate: { gte: startOfToday() }
    },
    orderBy: [{ expiryDate: "asc" }, { receivedDate: "asc" }],
    include: { product: { include: { supplier: true } } }
  });
}
