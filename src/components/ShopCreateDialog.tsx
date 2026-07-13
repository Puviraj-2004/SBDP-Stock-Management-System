"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createShopAction } from "@/lib/actions";
import { Button, Field, Input, TextArea } from "@/components/ui";

export function ShopCreateDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      await createShopAction(formData);
      formRef.current?.reset();
      setOpen(false);
      router.replace("/shops");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add shop.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add shop
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-md border border-line bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Add shop</h2>
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </Button>
            </div>
            <form ref={formRef} action={handleSubmit} className="grid gap-3">
              <Field label="Name"><Input name="name" required autoFocus /></Field>
              <Field label="Contact number"><Input name="contactNumber" /></Field>
              <Field label="Address"><TextArea name="address" /></Field>
              {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save shop"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
