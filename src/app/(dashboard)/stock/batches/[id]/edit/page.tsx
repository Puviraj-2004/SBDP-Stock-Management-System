import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DatePickerInput } from "@/components/DatePickerInput";
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
        _count: { select: { loadItems: true, returnItems: true, invoiceItems: true, ledgerEntries: true } }
      }
    }),
    prisma.product.findMany({ include: { supplier: true }, orderBy: [{ name: "asc" }, { measurement: "asc" }] })
  ]);
  if (!batch) notFound();

  const canDelete =
    batch._count.loadItems === 0 &&
    batch._count.returnItems === 0 &&
    batch._count.invoiceItems === 0 &&
    batch._count.ledgerEntries === 0;
  const isLockedByInvoices = batch._count.invoiceItems > 0;

  return (
    <>
      <PageHeader title="Edit batch" description={`${batch.product.name} ${batch.product.measurement} - received ${batch.receivedQuantity}`} />
      <Panel className="max-w-3xl">
        {isLockedByInvoices ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            This batch is already used in invoices, so it cannot be edited.
          </div>
        ) : null}
        <form action={updateBatchAction} className="grid gap-3">
          <input type="hidden" name="id" value={batch.id} />
          <Field label="Product">
            <Select name="productId" defaultValue={batch.productId} disabled={isLockedByInvoices} required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} {product.measurement} - {product.supplier.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Received quantity"><Input name="receivedQuantity" type="number" min="1" defaultValue={batch.receivedQuantity} disabled={isLockedByInvoices} required /></Field>
            <Field label="Cost price"><Input name="costPrice" type="number" min="0" step="0.01" defaultValue={String(batch.costPrice)} disabled={isLockedByInvoices} required /></Field>
            <Field label="Received date"><DatePickerInput name="receivedDate" defaultValue={toDateInputValue(batch.receivedDate)} disabled={isLockedByInvoices} required /></Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Expiry date"><DatePickerInput name="expiryDate" defaultValue={toDateInputValue(batch.expiryDate)} disabled={isLockedByInvoices} required /></Field>
          </div>
          <Button type="submit" disabled={isLockedByInvoices}>Save batch</Button>
        </form>
        {canDelete ? (
          <form action={deleteBatchAction} className="mt-4">
            <input type="hidden" name="id" value={batch.id} />
            <ConfirmSubmitButton type="submit" message={`Delete batch for ${batch.product.name}?`}>Delete batch</ConfirmSubmitButton>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
