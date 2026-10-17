"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { Button, Field, Input, Select } from "@/components/ui";
import { createProductAction } from "@/lib/actions";

type SupplierOption = {
  id: string;
  name: string;
};

type ExistingProduct = {
  id: string;
  name: string;
  measurement: string;
  supplierId: string;
  barcode: string | null;
  supplier: { name: string };
};

export function ProductCreateDialog({ suppliers }: { suppliers: SupplierOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [barcode, setBarcode] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [matches, setMatches] = useState<ExistingProduct[]>([]);
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const duplicate = matches.some((product) => product.supplierId === supplierId);

  useEffect(() => {
    if (!open || !barcode.trim()) {
      setMatches([]);
      setChecking(false);
      setLookupError("");
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    setMatches([]);
    setLookupError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/lookup?code=${encodeURIComponent(barcode.trim())}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Lookup failed");
        const result = await response.json() as { matches: ExistingProduct[] };
        if (!controller.signal.aborted) {
          setMatches(result.matches.filter((product) => product.barcode === barcode.trim()));
        }
      } catch {
        if (!controller.signal.aborted) setLookupError("Unable to check this barcode. Try again before saving.");
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [barcode, open]);

  async function handleSubmit(formData: FormData) {
    if (saving || checking || duplicate || lookupError) return;
    setSaving(true);
    setError("");

    try {
      const result = await createProductAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
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
      <Button type="button" onClick={() => {
        setBarcode("");
        setSupplierId("");
        setMatches([]);
        setError("");
        setLookupError("");
        setOpen(true);
      }}>
        <Plus size={16} />
        Add product
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-line bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="add-product-title" className="text-lg font-semibold text-ink">Add product</h2>
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </Button>
            </div>
            <form ref={formRef} action={handleSubmit} className="grid gap-4">
              <BarcodeScanInput name="barcode" submitOnEnter={false} submitOnScan={false} onValueChange={(value) => {
                setBarcode(value);
                setMatches([]);
                setChecking(Boolean(value.trim()));
                setError("");
              }} />
              {checking ? <p role="status" className="text-sm text-muted">Checking barcode...</p> : null}
              {matches.length > 0 ? (
                <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">This barcode is already added.</p>
                  {matches.map((product) => (
                    <div key={product.id} className="mt-2 flex items-center justify-between gap-3">
                      <span>{product.name} {product.measurement} - {product.supplier.name}</span>
                      <Link href={`/products/${product.id}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white" title="View existing product" aria-label={`View ${product.name}`}>
                        <Eye size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
              {lookupError ? <p role="alert" className="text-sm text-red-700">{lookupError}</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Supplier">
                  <Select name="supplierId" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
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
              {duplicate ? <p role="alert" className="text-sm text-red-700">This product already exists for the selected supplier.</p> : null}
              {error ? <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving || checking || duplicate || Boolean(lookupError)}>{saving ? "Saving..." : "Save product"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
