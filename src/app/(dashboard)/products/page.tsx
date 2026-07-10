import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ExportButton } from "@/components/ExportButton";
import { LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { deleteProductAction, productScanAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
            { itemCode: { contains: q, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { supplier: true, _count: { select: { invoiceItems: true } } },
    orderBy: { name: "asc" },
    take: 200
  });
  const stockTotals = await prisma.productBatch.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((product) => product.id) } },
    _sum: { quantity: true }
  });
  const stockByProductId = new Map(stockTotals.map((row) => [row.productId, row._sum.quantity ?? 0]));
  const productRows = products.map((product) => ({
    ...product,
    stockQuantity: stockByProductId.get(product.id) ?? 0
  }));

  return (
    <>
      <PageHeader
        title="Products"
        description="Products are unique by name, measurement, and supplier."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton href="/api/exports/products">Export Excel</ExportButton>
            <LinkButton href="/products/new">Add product</LinkButton>
          </div>
        }
      />
      <Panel className="mb-5">
        <form action={productScanAction}>
          <BarcodeScanInput name="q" defaultValue={q} />
        </form>
      </Panel>
      <Table headers={["Product", "Supplier", "Barcode", "Item code", "Price", "Stock", "Actions"]}>
        {productRows.map((product) => (
          <tr key={product.id}>
            <td className="px-3 py-2">
              <span className="font-medium">{product.name} {product.measurement}</span>
            </td>
            <td className="px-3 py-2">{product.supplier.name}</td>
            <td className="px-3 py-2 tabular">{product.barcode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{product.itemCode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{money(product.sellingPrice)}</td>
            <td className="px-3 py-2 tabular">{product.stockQuantity}</td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                  title="View product details"
                  aria-label={`View ${product.name}`}
                >
                  <Eye size={15} />
                </Link>
                <Link
                  href={`/products/${product.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                  title="Edit product"
                  aria-label={`Edit ${product.name}`}
                >
                  <Edit size={15} />
                </Link>
                {product.stockQuantity === 0 && product._count.invoiceItems === 0 ? (
                  <form action={deleteProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <ConfirmSubmitButton
                      type="submit"
                      message={`Delete ${product.name}?`}
                      className="h-8 w-8 px-0"
                      title="Delete product"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 size={15} />
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
