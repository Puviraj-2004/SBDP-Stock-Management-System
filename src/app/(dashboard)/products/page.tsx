import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Edit, Eye, Trash2 } from "lucide-react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ExportButton } from "@/components/ExportButton";
import { PaginationControls } from "@/components/PaginationControls";
import { ProductCreateDialog } from "@/components/ProductCreateDialog";
import { PageHeader, Panel, Table } from "@/components/ui";
import { deleteProductAction, productScanAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";
import { getCompanyStockByProductIds } from "@/lib/stockLedger";

type ProductListRow = Prisma.ProductGetPayload<{
  include: { supplier: true; _count: { select: { invoiceItems: true } } };
}>;

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const where: Prisma.ProductWhereInput | undefined = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
            { itemCode: { contains: q, mode: "insensitive" } }
          ]
        }
      : undefined;
  const [products, totalProducts, suppliers] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { supplier: true, _count: { select: { invoiceItems: true } } },
      orderBy: { name: "asc" },
      ...getPagination(page)
    }) as Promise<ProductListRow[]>,
    prisma.product.count({ where }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  const stockByProductId = await getCompanyStockByProductIds(products.map((product) => product.id));
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
            <ProductCreateDialog suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))} />
          </div>
        }
      />
      <Panel className="mb-5">
        <form action={productScanAction}>
          <BarcodeScanInput name="q" defaultValue={q} />
        </form>
      </Panel>
      <Table headers={["Product", "Supplier", "Barcode", "Item code", "Selling", "MRP", "Stock", "Actions"]}>
        {productRows.map((product) => (
          <tr key={product.id}>
            <td className="px-3 py-2">
              <span className="font-medium">{product.name} {product.measurement}</span>
            </td>
            <td className="px-3 py-2">{product.supplier.name}</td>
            <td className="px-3 py-2 tabular">{product.barcode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{product.itemCode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{money(product.sellingPrice)}</td>
            <td className="px-3 py-2 tabular">{product.mrp ? money(product.mrp) : "-"}</td>
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
      <div className="mt-4">
        <PaginationControls
          pathname="/products"
          page={page}
          pageCount={getPageCount(totalProducts)}
          total={totalProducts}
          pageSize={DEFAULT_PAGE_SIZE}
          params={{ q }}
        />
      </div>
    </>
  );
}
