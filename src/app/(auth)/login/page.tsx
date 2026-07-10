import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { getSessionOwnerId } from "@/lib/auth";
import { Button, Field, Input, Panel } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ownerId = await getSessionOwnerId();
  if (ownerId) redirect("/");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Panel className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Store Management</h1>
        <p className="mt-1 text-sm text-muted">Sign in with the shared owner login.</p>
        {params.error ? <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">Invalid username or password.</p> : null}
        <form action={loginAction} className="mt-4 grid gap-3">
          <Field label="Username">
            <Input name="username" autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password">
            <PasswordInput name="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit">Sign in</Button>
        </form>
      </Panel>
    </main>
  );
}
