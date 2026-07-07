import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel, Select } from "@/components/ui";
import { deleteBatchAction, updateBatchAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";

export default async function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [batch, products] = await Promise.all([
    prisma.productBatch.findUnique({
      where: { id },
      include: {
        product: { include: { supplier: true } },
        _count: { select: { tripItems: true } }
      }
    }),
    prisma.product.findMany({ include: { supplier: true }, orderBy: [{ name: "asc" }, { measurement: "asc" }] })
  ]);
  if (!batch) notFound();

  return (
    <>
      <PageHeader title="Edit batch" description={`${batch.product.name} ${batch.product.measurement} · current qty ${batch.quantity}`} />
      <Panel className="max-w-3xl">
        <form action={updateBatchAction} className="grid gap-3">
          <input type="hidden" name="id" value={batch.id} />
          <Field label="Product">
            <Select name="productId" defaultValue={batch.productId} required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} {product.measurement} · {product.supplier.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Quantity"><Input name="quantity" type="number" min="0" defaultValue={batch.quantity} required /></Field>
            <Field label="Received date"><Input name="receivedDate" type="date" defaultValue={toDateInputValue(batch.receivedDate)} required /></Field>
            <Field label="Expiry date"><Input name="expiryDate" type="date" defaultValue={toDateInputValue(batch.expiryDate)} required /></Field>
          </div>
          <Button type="submit">Save batch</Button>
        </form>
        {batch._count.tripItems === 0 ? (
          <form action={deleteBatchAction} className="mt-4">
            <input type="hidden" name="id" value={batch.id} />
            <ConfirmSubmitButton type="submit" message={`Delete batch for ${batch.product.name}?`}>Delete batch</ConfirmSubmitButton>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
