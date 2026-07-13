"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { Button, Field, Input, Select } from "@/components/ui";
import { createProductAction } from "@/lib/actions";

type SupplierOption = {
  id: string;
  name: string;
};

export function ProductCreateDialog({ suppliers }: { suppliers: SupplierOption[] }) {
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
      await createProductAction(formData);
      formRef.current?.reset();
      setOpen(false);
      router.replace("/products");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add product
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-line bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Add product</h2>
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </Button>
            </div>
            <form ref={formRef} action={handleSubmit} className="grid gap-4">
              <BarcodeScanInput name="barcode" submitOnEnter={false} submitOnScan={false} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Supplier">
                  <Select name="supplierId" required>
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </Select>
                </Field>
                <Field label="Selling price"><Input name="sellingPrice" type="number" min="0" step="0.01" required /></Field>
                <Field label="MRP"><Input name="mrp" type="number" min="0" step="0.01" /></Field>
                <Field label="Product name"><Input name="name" required /></Field>
                <Field label="Measurement"><Input name="measurement" placeholder="1L, 500ml, 400g" required /></Field>
                <Field label="Item code"><Input name="itemCode" /></Field>
              </div>
              {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save product"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
