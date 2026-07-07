import { Button, Field, Input, PageHeader, Panel } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";
import { updateOwnerAction } from "@/lib/actions";
import { getSessionOwner } from "@/lib/auth";

export default async function AccountPage() {
  const owner = await getSessionOwner();

  return (
    <>
      <PageHeader title="Account" description="Update the shared owner login used by this internal tool." />
      <Panel className="max-w-xl">
        <form action={updateOwnerAction} className="grid gap-3">
          <input type="hidden" name="id" value={owner?.id ?? ""} />
          <Field label="Username"><Input name="username" defaultValue={owner?.username ?? ""} required /></Field>
          <Field label="New password" hint="Leave blank to keep the current password.">
            <PasswordInput name="password" minLength={8} />
          </Field>
          <Button type="submit">Save account</Button>
        </form>
      </Panel>
    </>
  );
}
