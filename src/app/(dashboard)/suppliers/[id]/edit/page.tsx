import { notFound } from "next/navigation";
import { Button, Field, Input, PageHeader, Panel, TextArea } from "@/components/ui";
import { updateSupplierAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <>
      <PageHeader title="Edit supplier" description={supplier.name} />
      <Panel className="max-w-xl">
        <form action={updateSupplierAction} className="grid gap-3">
          <input type="hidden" name="id" value={supplier.id} />
          <Field label="Name"><Input name="name" defaultValue={supplier.name} required /></Field>
          <Field label="Contact info"><TextArea name="contactInfo" defaultValue={supplier.contactInfo ?? ""} /></Field>
          <Button type="submit">Save supplier</Button>
        </form>
      </Panel>
    </>
  );
}
