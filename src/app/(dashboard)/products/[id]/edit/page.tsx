import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel, Select } from "@/components/ui";
import { deleteProductAction, updateProductAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { batches: true, invoiceItems: true } } }
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title="Edit product" description={`${product.name} ${product.measurement}`} />
      <Panel className="max-w-3xl">
        <form action={updateProductAction} className="grid gap-4">
          <input type="hidden" name="id" value={product.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Supplier">
              <Select name="supplierId" defaultValue={product.supplierId} required>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            <Field label="Selling price"><Input name="sellingPrice" type="number" min="0" step="0.01" defaultValue={String(product.sellingPrice)} required /></Field>
            <Field label="MRP"><Input name="mrp" type="number" min="0" step="0.01" defaultValue={product.mrp ? String(product.mrp) : ""} /></Field>
            <Field label="Product name"><Input name="name" defaultValue={product.name} required /></Field>
            <Field label="Measurement"><Input name="measurement" defaultValue={product.measurement} required /></Field>
            <Field label="Barcode"><Input name="barcode" defaultValue={product.barcode ?? ""} /></Field>
            <Field label="Item code"><Input name="itemCode" defaultValue={product.itemCode ?? ""} /></Field>
          </div>
          <Button type="submit">Save product</Button>
        </form>
        {product._count.batches === 0 && product._count.invoiceItems === 0 ? (
          <form action={deleteProductAction} className="mt-4">
            <input type="hidden" name="id" value={product.id} />
            <ConfirmSubmitButton type="submit" message={`Delete ${product.name}?`}>Delete product</ConfirmSubmitButton>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
