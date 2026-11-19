import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SupplierProductsView } from "@/components/SupplierProductsView";
import { deleteSupplierAction } from "@/lib/actions";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getCompanyStockByProductIds } from "@/lib/stockLedger";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      salesReps: {
        orderBy: { name: "asc" }
      },
      products: {
        include: {
          rep: {
            select: { id: true, name: true }
          },
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
      id: product.id,
      name: product.name,
      measurement: product.measurement,
      barcode: product.barcode,
      itemCode: product.itemCode,
      sellingPrice: Number(product.sellingPrice),
      mrp: product.mrp !== null ? Number(product.mrp) : null,
      stock,
      costPrice,
      totalCostValue,
      repId: product.repId,
      rep: product.rep,
      supplierId: product.supplierId
    };
  });

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

      <SupplierProductsView
        supplier={{
          id: supplier.id,
          name: supplier.name,
          contactInfo: supplier.contactInfo
        }}
        salesReps={supplier.salesReps}
        products={productRows}
      />
    </>
  );
}
