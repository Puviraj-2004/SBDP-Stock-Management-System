import { Button, Field, Input, PageHeader, Panel, TextArea } from "@/components/ui";
import { createShopAction } from "@/lib/actions";

export default function NewShopPage() {
  return (
    <>
      <PageHeader title="Add shop" description="Create a permanent shop record before invoices are entered." />
      <Panel className="max-w-xl">
        <form action={createShopAction} className="grid gap-3">
          <Field label="Name"><Input name="name" required /></Field>
          <Field label="Contact number"><Input name="contactNumber" /></Field>
          <Field label="Address"><TextArea name="address" /></Field>
          <Button type="submit">Save shop</Button>
        </form>
      </Panel>
    </>
  );
}
