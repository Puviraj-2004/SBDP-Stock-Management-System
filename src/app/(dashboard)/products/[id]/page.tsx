import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteProductAction } from "@/lib/actions";
import { LinkButton, PageHeader, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money } from "@/lib/dates";
import { getCompanyStockByProductIds, getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: true, batches: { orderBy: { expiryDate: "asc" } } }
  });
  if (!product) notFound();

  const [warehouseBalances, companyStock] = await Promise.all([
    getWarehouseBalancesByBatchIds(product.batches.map((batch) => batch.id)),
    getCompanyStockByProductIds([product.id])
  ]);
  const totalStock = companyStock.get(product.id) ?? 0;
  const latestBatch = [...product.batches].sort((a, b) => b.receivedDate.getTime() - a.receivedDate.getTime())[0];
  const latestMargin = latestBatch ? Number(product.sellingPrice) - Number(latestBatch.costPrice) : null;
  const latestMarginPercent = latestBatch && Number(product.sellingPrice) > 0
    ? (Number(latestMargin) / Number(product.sellingPrice)) * 100
    : null;
  const canDelete = product.batches.length === 0;

  return (
    <>
      <PageHeader
        title={`${product.name} ${product.measurement}`}
        description={`${product.supplier.name} - selling ${money(product.sellingPrice)} - MRP ${product.mrp ? money(product.mrp) : "-"} - stock ${totalStock}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/products/${product.id}/edit`} variant="secondary">Edit product</LinkButton>
            <LinkButton href={`/stock/receive?productId=${product.id}`}>Receive stock</LinkButton>
            {canDelete ? (
              <form action={deleteProductAction}>
                <input type="hidden" name="id" value={product.id} />
                <ConfirmSubmitButton type="submit" message={`Delete ${product.name}?`}>Delete</ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        }
      />

      {latestBatch ? (
        <div className="mb-4 rounded-md border border-line bg-white p-4 text-sm">
          <div className="font-semibold">Latest batch margin</div>
          <div className="mt-1 text-muted">
            Selling {money(product.sellingPrice)} - cost {money(latestBatch.costPrice)} = {money(latestMargin ?? 0)}
            {latestMarginPercent === null ? "" : ` (${latestMarginPercent.toFixed(1)}%)`}
          </div>
        </div>
      ) : null}

      <Table headers={["Received qty", "Warehouse balance", "Cost price", "Received", "Expiry", "Alert sent", "Action"]}>
        {product.batches.map((batch) => (
          <tr key={batch.id}>
            <td className="px-3 py-2 tabular">{batch.receivedQuantity}</td>
            <td className="px-3 py-2 tabular">{warehouseBalances.get(batch.id) ?? 0}</td>
            <td className="px-3 py-2 tabular">{money(batch.costPrice)}</td>
            <td className="px-3 py-2 tabular">{displayDate(batch.receivedDate)}</td>
            <td className="px-3 py-2 tabular">{displayDate(batch.expiryDate)}</td>
            <td className="px-3 py-2">{batch.alertSent ? "Yes" : "No"}</td>
            <td className="px-3 py-2">
              <Link
                href={`/stock/batches/${batch.id}/edit`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                title="Edit batch"
                aria-label="Edit batch"
              >
                <Edit size={15} />
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
