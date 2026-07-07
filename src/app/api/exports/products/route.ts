import { prisma } from "@/lib/db";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

export async function GET() {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const products = await prisma.product.findMany({
    include: { supplier: true, batches: true },
    orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }]
  });

  return workbookResponse("products-export.xlsx", [
    {
      name: "Products",
      columns: ["Product", "Measurement", "Supplier", "Barcode", "Item Code", "Selling Price", "Current Stock"],
      rows: products.map((product) => [
        product.name,
        product.measurement,
        product.supplier.name,
        product.barcode,
        product.itemCode,
        Number(product.sellingPrice),
        product.batches.reduce((sum, batch) => sum + batch.quantity, 0)
      ])
    }
  ]);
}
