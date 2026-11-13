import { notFound } from "next/navigation";
import { Banknote, Boxes } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteSupplierAction } from "@/lib/actions";
import { LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";
import { getCompanyStockByProductIds } from "@/lib/stockLedger";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          batches: {
            orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }]
          }
        },
        orderBy: { name: "asc" }
      }
    }
  });
  if (!supplier) notFound();

  const stockByProductId = await getCompanyStockByProductIds(supplier.products.map((product) => product.id));

  const productRows = supplier.products.map((product) => {
    const stock = stockByProductId.get(product.id) ?? 0;
    const latestBatch = product.batches[0];
    const costPrice = latestBatch ? Number(latestBatch.costPrice) : null;
    const totalCostValue = costPrice !== null ? stock * costPrice : 0;

    return {
      ...product,
      stock,
      costPrice,
      totalCostValue
    };
  });

  const totalStockUnits = productRows.reduce((sum, p) => sum + p.stock, 0);
  const totalStockCostValue = productRows.reduce((sum, p) => sum + p.totalCostValue, 0);

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={supplier.contactInfo ?? "Supplier detail"}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="secondary">Edit</LinkButton>
            {supplier.products.length === 0 ? (
              <form action={deleteSupplierAction}>
                <input type="hidden" name="id" value={supplier.id} />
                <ConfirmSubmitButton type="submit" message={`Delete ${supplier.name}?`}>Delete</ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-muted">Total Stock in Hand</h2>
              <div className="mt-2 text-2xl font-semibold tabular">{totalStockUnits.toLocaleString()} units</div>
              <div className="mt-1 text-xs text-muted">Across {productRows.length} registered products</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eeebe4] text-accent">
              <Boxes size={18} />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-muted">Total Stock Value (Cost)</h2>
              <div className="mt-2 text-2xl font-semibold tabular text-accent">{money(totalStockCostValue)}</div>
              <div className="mt-1 text-xs text-muted">Total supplier purchase value in stock</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eeebe4] text-accent">
              <Banknote size={18} />
            </div>
          </div>
        </Panel>
      </div>

      <Table headers={["Product", "Measurement", "Barcode", "Cost price", "Selling", "MRP", "Stock", "Total value"]}>
        {productRows.map((product) => (
          <tr key={product.id}>
            <td className="px-3 py-2 font-medium">{product.name}</td>
            <td className="px-3 py-2">{product.measurement}</td>
            <td className="px-3 py-2 tabular">{product.barcode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{product.costPrice !== null ? money(product.costPrice) : "-"}</td>
            <td className="px-3 py-2 tabular">{money(product.sellingPrice)}</td>
            <td className="px-3 py-2 tabular">{product.mrp ? money(product.mrp) : "-"}</td>
            <td className="px-3 py-2 tabular font-medium">{product.stock}</td>
            <td className="px-3 py-2 tabular font-semibold text-accent">
              {product.costPrice !== null ? money(product.totalCostValue) : "-"}
            </td>
          </tr>
        ))}
        {productRows.length > 0 ? (
          <tr className="border-t-2 border-line bg-[#f8f6f0] font-semibold text-ink">
            <td className="px-3 py-3" colSpan={6}>
              Grand Total ({productRows.length} products)
            </td>
            <td className="px-3 py-3 tabular">{totalStockUnits.toLocaleString()}</td>
            <td className="px-3 py-3 tabular text-accent font-bold">{money(totalStockCostValue)}</td>
          </tr>
        ) : null}
      </Table>
    </>
  );
}
