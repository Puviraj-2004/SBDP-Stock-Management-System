import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteProductAction } from "@/lib/actions";
import { LinkButton, PageHeader, Table } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money } from "@/lib/dates";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: true, batches: { orderBy: { expiryDate: "asc" } } }
  });
  if (!product) notFound();
  const totalStock = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
  const canDelete = product.batches.length === 0;

  return (
    <>
      <PageHeader
        title={`${product.name} ${product.measurement}`}
        description={`${product.supplier.name} · ${money(product.sellingPrice)} · total stock ${totalStock}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/products/${product.id}/edit`} variant="secondary">Edit product</LinkButton>
            {canDelete ? (
              <form action={deleteProductAction}>
                <input type="hidden" name="id" value={product.id} />
                <ConfirmSubmitButton type="submit" message={`Delete ${product.name}?`}>Delete</ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        }
      />
      <Table headers={["Quantity", "Received", "Expiry", "Alert sent", "Action"]}>
        {product.batches.map((batch) => (
          <tr key={batch.id}>
            <td className="px-3 py-2 tabular">{batch.quantity}</td>
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
