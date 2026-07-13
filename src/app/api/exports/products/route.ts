import { prisma } from "@/lib/db";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";
import { getCompanyStockByProductIds } from "@/lib/stockLedger";

export async function GET() {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const products = await prisma.product.findMany({
    include: { supplier: true, batches: true },
    orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }]
  });
  const stockByProductId = await getCompanyStockByProductIds(products.map((product) => product.id));

  return workbookResponse("products-export.xlsx", [
    {
      name: "Products",
      columns: ["Product", "Measurement", "Supplier", "Barcode", "Item Code", "Selling Price", "MRP", "Current Stock"],
      rows: products.map((product) => [
        product.name,
        product.measurement,
        product.supplier.name,
        product.barcode,
        product.itemCode,
        Number(product.sellingPrice),
        product.mrp ? Number(product.mrp) : null,
        stockByProductId.get(product.id) ?? 0
      ])
    }
  ]);
}
