import { prisma } from "@/lib/db";

export type ReconciliationRow = {
  productId: string;
  productName: string;
  measurement: string;
  supplierName: string;
  expectedSold: number;
  totalBilled: number;
  mismatch: number;
};

export async function getTripReconciliation(tripId: string) {
  const tripItems = await prisma.loadingTripItem.findMany({
    where: { tripId },
    include: {
      batch: {
        include: {
          product: { include: { supplier: true } }
        }
      }
    }
  });

  const invoices = await prisma.invoice.findMany({
    where: { tripId },
    include: { items: true }
  });

  const expectedByProduct = new Map<string, ReconciliationRow>();

  for (const item of tripItems) {
    const product = item.batch.product;
    const current = expectedByProduct.get(product.id) ?? {
      productId: product.id,
      productName: product.name,
      measurement: product.measurement,
      supplierName: product.supplier.name,
      expectedSold: 0,
      totalBilled: 0,
      mismatch: 0
    };
    current.expectedSold += item.quantityLoaded - (item.quantityReturned ?? 0);
    expectedByProduct.set(product.id, current);
  }

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const current =
        expectedByProduct.get(item.productId) ??
        ({
          productId: item.productId,
          productName: "Product not loaded",
          measurement: "",
          supplierName: "",
          expectedSold: 0,
          totalBilled: 0,
          mismatch: 0
        } satisfies ReconciliationRow);
      current.totalBilled += item.quantity;
      expectedByProduct.set(item.productId, current);
    }
  }

  const rows = Array.from(expectedByProduct.values()).map((row) => ({
    ...row,
    mismatch: row.expectedSold - row.totalBilled
  }));

  return {
    rows,
    expectedTotal: rows.reduce((sum, row) => sum + row.expectedSold, 0),
    billedTotal: rows.reduce((sum, row) => sum + row.totalBilled, 0),
    mismatchCount: rows.filter((row) => row.mismatch !== 0).length
  };
}
