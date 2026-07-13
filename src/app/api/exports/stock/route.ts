import { prisma } from "@/lib/db";
import { displayDate, inTwoMonths, startOfToday } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

export async function GET() {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const today = startOfToday();
  const soon = inTwoMonths();
  const batches = await prisma.productBatch.findMany({
    include: { product: { include: { supplier: true } } },
    orderBy: [{ expiryDate: "asc" }, { product: { name: "asc" } }]
  });
  const warehouseBalances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id));

  return workbookResponse("stock-export.xlsx", [
    {
      name: "Stock",
      columns: ["Product", "Measurement", "Supplier", "Barcode", "Item Code", "Received Qty", "Warehouse Balance", "Cost Price", "Received Date", "Expiry Date", "State"],
      rows: batches.map((batch) => {
        const expired = batch.expiryDate < today;
        const expiring = !expired && batch.expiryDate <= soon;
        const warehouseBalance = warehouseBalances.get(batch.id) ?? 0;
        return [
          batch.product.name,
          batch.product.measurement,
          batch.product.supplier.name,
          batch.product.barcode,
          batch.product.itemCode,
          batch.receivedQuantity,
          warehouseBalance,
          Number(batch.costPrice),
          displayDate(batch.receivedDate),
          displayDate(batch.expiryDate),
          expired ? "Expired" : expiring ? "Expiring soon" : "Available"
        ];
      })
    }
  ]);
}
