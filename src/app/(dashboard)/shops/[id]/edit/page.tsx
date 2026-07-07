import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel, TextArea } from "@/components/ui";
import { deleteShopAction, updateShopAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function EditShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: { _count: { select: { invoices: true, payments: true } } }
  });
  if (!shop) notFound();

  return (
    <>
      <PageHeader title="Edit shop" description={shop.name} />
      <Panel className="max-w-xl">
        <form action={updateShopAction} className="grid gap-3">
          <input type="hidden" name="id" value={shop.id} />
          <Field label="Name"><Input name="name" defaultValue={shop.name} required /></Field>
          <Field label="Contact number"><Input name="contactNumber" defaultValue={shop.contactNumber ?? ""} /></Field>
          <Field label="Address"><TextArea name="address" defaultValue={shop.address ?? ""} /></Field>
          <Button type="submit">Save shop</Button>
        </form>
        {shop._count.invoices === 0 && shop._count.payments === 0 ? (
          <form action={deleteShopAction} className="mt-4">
            <input type="hidden" name="id" value={shop.id} />
            <ConfirmSubmitButton type="submit" message={`Delete ${shop.name}?`}>Delete shop</ConfirmSubmitButton>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
