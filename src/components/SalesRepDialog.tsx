"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, TextArea } from "@/components/ui";
import { createSalesRepAction, updateSalesRepAction } from "@/lib/actions";

type SupplierOption = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
  measurement: string;
  supplierId: string;
  repId: string | null;
};

type RepData = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  supplierId: string;
};

export function SalesRepDialog({
  suppliers,
  products,
  repToEdit,
  defaultSupplierId,
  trigger
}: {
  suppliers: SupplierOption[];
  products: ProductOption[];
  repToEdit?: RepData;
  defaultSupplierId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState(repToEdit?.supplierId ?? defaultSupplierId ?? "");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => {
    if (repToEdit) {
      return new Set(products.filter((p) => p.repId === repToEdit.id).map((p) => p.id));
    }
    return new Set();
  });
  const [productSearch, setProductSearch] = useState("");

  // Products belonging to the selected supplier
  const supplierProducts = useMemo(() => {
    if (!supplierId) return [];
    return products.filter((p) => p.supplierId === supplierId);
  }, [products, supplierId]);

  // Filtered by search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return supplierProducts;
    const q = productSearch.toLowerCase().trim();
    return supplierProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.measurement.toLowerCase().includes(q)
    );
  }, [supplierProducts, productSearch]);

  const handleOpen = () => {
    setSupplierId(repToEdit?.supplierId ?? defaultSupplierId ?? "");
    if (repToEdit) {
      setSelectedProductIds(new Set(products.filter((p) => p.repId === repToEdit.id).map((p) => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
    setProductSearch("");
    setError("");
    setOpen(true);
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  async function handleSubmit(formData: FormData) {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      // Append all selected product IDs
      formData.delete("assignedProductIds");
      selectedProductIds.forEach((pid) => {
        formData.append("assignedProductIds", pid);
      });

      if (repToEdit) {
        formData.set("id", repToEdit.id);
        await updateSalesRepAction(formData);
      } else {
        await createSalesRepAction(formData);
      }

      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save sales rep.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button type="button" onClick={handleOpen}>
          <Plus size={16} />
          Add sales rep
        </Button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {repToEdit ? `Edit Sales Rep: ${repToEdit.name}` : "Add Sales Rep"}
                  </h2>
                  <p className="text-xs text-muted">
                    Assign a sales representative to a supplier and assign products.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-9 px-0"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </Button>
            </div>

            <form ref={formRef} action={handleSubmit} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Supplier *">
                  <Select
                    name="supplierId"
                    value={supplierId}
                    onChange={(e) => {
                      setSupplierId(e.target.value);
                      setSelectedProductIds(new Set());
                    }}
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Rep Name *">
                  <Input
                    name="name"
                    defaultValue={repToEdit?.name ?? ""}
                    placeholder="e.g. Suresh Kumar"
                    required
                    autoFocus
                  />
                </Field>

                <Field label="Phone Number (Optional)">
                  <Input
                    name="phone"
                    type="tel"
                    defaultValue={repToEdit?.phone ?? ""}
                    placeholder="e.g. 077 123 4567"
                  />
                </Field>

                <Field label="Notes / Remarks (Optional)">
                  <Input
                    name="notes"
                    defaultValue={repToEdit?.notes ?? ""}
                    placeholder="e.g. Ice cream range"
                  />
                </Field>
              </div>

              {/* Product Assignment Checklist */}
              {supplierId ? (
                <div className="mt-2 rounded-lg border border-line bg-[#faf9f5] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        Assign Products ({selectedProductIds.size} selected)
                      </h3>
                      <p className="text-xs text-muted">
                        Select which products this sales rep handles for this supplier.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        onClick={handleSelectAllFiltered}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        onClick={handleDeselectAllFiltered}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Search filter for products */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 text-muted" size={14} />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name or measurement..."
                      className="pl-8 text-sm"
                    />
                  </div>

                  {filteredProducts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted">
                      {supplierProducts.length === 0
                        ? "No products registered for this supplier yet."
                        : "No matching products found."}
                    </p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded border border-line bg-white p-2">
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {filteredProducts.map((p) => {
                          const isChecked = selectedProductIds.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
                                isChecked
                                  ? "bg-emerald-50 text-emerald-950 font-medium"
                                  : "hover:bg-slate-50 text-ink"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleProduct(p.id)}
                                className="h-4 w-4 rounded border-line text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="truncate">
                                {p.name} <span className="text-muted">({p.measurement})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : repToEdit ? "Update rep" : "Save rep"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
