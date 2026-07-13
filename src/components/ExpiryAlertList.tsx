import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge, EmptyState, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, inTwoMonths, startOfToday } from "@/lib/dates";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

export async function ExpiryAlertList() {
  const batches = await prisma.productBatch.findMany({
    where: {
      expiryDate: { gte: startOfToday(), lte: inTwoMonths() }
    },
    include: { product: { include: { supplier: true } } },
    orderBy: { expiryDate: "asc" },
    take: 12
  });
  const warehouseBalances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id));
  const batchesWithStock = batches.filter((batch) => (warehouseBalances.get(batch.id) ?? 0) > 0);

  if (batchesWithStock.length === 0) {
    return <EmptyState>No stock is expiring within the next two months.</EmptyState>;
  }

  return (
    <Table headers={["Product", "Supplier", "Qty", "Expiry", "State", "Action"]}>
      {batchesWithStock.map((batch) => (
        <tr key={batch.id}>
          <td className="px-3 py-2 font-medium">{batch.product.name} {batch.product.measurement}</td>
          <td className="px-3 py-2">{batch.product.supplier.name}</td>
          <td className="px-3 py-2 tabular">{warehouseBalances.get(batch.id) ?? 0}</td>
          <td className="px-3 py-2 tabular">{displayDate(batch.expiryDate)}</td>
          <td className="px-3 py-2">
            <Badge tone="amber">expiring soon</Badge>
          </td>
          <td className="px-3 py-2">
            <Link href={`/products/${batch.productId}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View product" aria-label="View product">
              <Eye size={15} />
            </Link>
          </td>
        </tr>
      ))}
    </Table>
  );
}
