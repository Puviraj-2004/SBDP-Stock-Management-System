import { prisma } from "@/lib/db";
import { displayDate, inTwoMonths, startOfToday } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

export async function GET() {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const today = startOfToday();
  const soon = inTwoMonths();
  const batches = await prisma.productBatch.findMany({
    include: { product: { include: { supplier: true } } },
    orderBy: [{ expiryDate: "asc" }, { product: { name: "asc" } }]
  });

  return workbookResponse("stock-export.xlsx", [
    {
      name: "Stock",
      columns: ["Product", "Measurement", "Supplier", "Barcode", "Item Code", "Batch Qty", "Received Date", "Expiry Date", "State"],
      rows: batches.map((batch) => {
        const expired = batch.expiryDate < today;
        const expiring = !expired && batch.expiryDate <= soon;
        return [
          batch.product.name,
          batch.product.measurement,
          batch.product.supplier.name,
          batch.product.barcode,
          batch.product.itemCode,
          batch.quantity,
          displayDate(batch.receivedDate),
          displayDate(batch.expiryDate),
          expired ? "Expired" : expiring ? "Expiring soon" : "Available"
        ];
      })
    }
  ]);
}
