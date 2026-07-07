import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteSupplierAction } from "@/lib/actions";
import { LinkButton, PageHeader, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { products: { include: { batches: true }, orderBy: { name: "asc" } } }
  });
  if (!supplier) notFound();

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
      <Table headers={["Product", "Measurement", "Barcode", "Item code", "Price", "Stock"]}>
        {supplier.products.map((product) => (
          <tr key={product.id}>
            <td className="px-3 py-2 font-medium">{product.name}</td>
            <td className="px-3 py-2">{product.measurement}</td>
            <td className="px-3 py-2 tabular">{product.barcode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{product.itemCode ?? "-"}</td>
            <td className="px-3 py-2 tabular">{money(product.sellingPrice)}</td>
            <td className="px-3 py-2 tabular">{product.batches.reduce((sum, batch) => sum + batch.quantity, 0)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
