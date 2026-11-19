"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Package, Phone, Search, Trash2, UserCheck, X } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SalesRepDialog } from "@/components/SalesRepDialog";
import { Input, Select, Table } from "@/components/ui";
import { deleteSalesRepAction } from "@/lib/actions";

type RepItem = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  supplierId: string;
  supplier: { id: string; name: string };
  products: { id: string; name: string; measurement: string }[];
};

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

export function SalesRepsTable({
  reps,
  suppliers,
  allProducts
}: {
  reps: RepItem[];
  suppliers: SupplierOption[];
  allProducts: ProductOption[];
}) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  const filteredReps = useMemo(() => {
    return reps.filter((rep) => {
      const matchesSupplier = !supplierFilter || rep.supplierId === supplierFilter;
      if (!matchesSupplier) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        rep.name.toLowerCase().includes(q) ||
        rep.supplier.name.toLowerCase().includes(q) ||
        (rep.phone && rep.phone.includes(q)) ||
        (rep.notes && rep.notes.toLowerCase().includes(q))
      );
    });
  }, [reps, search, supplierFilter]);

  return (
    <div className="grid gap-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 text-muted" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reps by name, supplier, or phone..."
            className="pl-9"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="w-56">
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">All Suppliers ({suppliers.length})</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing {filteredReps.length} of {reps.length} sales reps
        </span>
      </div>

      {/* Reps Table */}
      <Table headers={["Rep Name", "Supplier", "Phone", "Assigned Products", "Notes", "Actions"]}>
        {filteredReps.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-8 text-center text-sm text-muted">
              {reps.length === 0
                ? "No sales representatives registered yet. Click 'Add sales rep' above to create one."
                : "No sales representatives match your search criteria."}
            </td>
          </tr>
        ) : (
          filteredReps.map((rep) => (
            <tr key={rep.id} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <span className="font-semibold text-ink">{rep.name}</span>
                  </div>
                </div>
              </td>

              <td className="px-3 py-2">
                <Link
                  href={`/suppliers/${rep.supplierId}`}
                  className="font-medium text-emerald-800 hover:underline"
                >
                  {rep.supplier.name}
                </Link>
              </td>

              <td className="px-3 py-2 tabular">
                {rep.phone ? (
                  <span className="inline-flex items-center gap-1 text-ink">
                    <Phone size={13} className="text-muted" />
                    {rep.phone}
                  </span>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>

              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                  <Package size={12} />
                  {rep.products.length} products
                </span>
              </td>

              <td className="px-3 py-2 text-xs text-muted">
                {rep.notes ?? "-"}
              </td>

              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <SalesRepDialog
                    suppliers={suppliers}
                    products={allProducts}
                    repToEdit={{
                      id: rep.id,
                      name: rep.name,
                      phone: rep.phone,
                      notes: rep.notes,
                      supplierId: rep.supplierId
                    }}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                        title="Edit sales rep"
                        aria-label={`Edit ${rep.name}`}
                      >
                        <Edit size={15} />
                      </button>
                    }
                  />

                  <form action={deleteSalesRepAction}>
                    <input type="hidden" name="id" value={rep.id} />
                    <ConfirmSubmitButton
                      type="submit"
                      message={`Delete sales rep ${rep.name}? Assigned products will become unassigned and will NOT be deleted.`}
                      className="h-8 w-8 px-0"
                      title="Delete sales rep"
                      aria-label={`Delete ${rep.name}`}
                    >
                      <Trash2 size={15} />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
