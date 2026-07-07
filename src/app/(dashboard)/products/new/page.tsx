import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { Button, Field, Input, PageHeader, Panel, Select } from "@/components/ui";
import { createProductAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const [{ code }, suppliers] = await Promise.all([
    searchParams,
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Add product" description="Scan first when a barcode or item code is available." />
      <Panel className="max-w-3xl">
        <form action={createProductAction} className="grid gap-4">
          <BarcodeScanInput name="barcode" defaultValue={code} submitOnEnter={false} submitOnScan={false} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Supplier">
              <Select name="supplierId" required>
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            <Field label="Selling price"><Input name="sellingPrice" type="number" min="0" step="0.01" required /></Field>
            <Field label="Product name"><Input name="name" required /></Field>
            <Field label="Measurement"><Input name="measurement" placeholder="1L, 500ml, 400g" required /></Field>
            <Field label="Item code"><Input name="itemCode" /></Field>
          </div>
          <Button type="submit">Save product</Button>
        </form>
      </Panel>
    </>
  );
}
