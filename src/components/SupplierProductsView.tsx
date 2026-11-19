"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Banknote, Boxes, Package, Search, UserCheck, Users, X } from "lucide-react";
import { SalesRepDialog } from "@/components/SalesRepDialog";
import { Input, Panel, Select, Table } from "@/components/ui";
import { money } from "@/lib/dates";
import { updateProductRepInlineAction } from "@/lib/actions";

type SalesRepInfo = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  supplierId: string;
};

type ProductRowItem = {
  id: string;
  name: string;
  measurement: string;
  barcode: string | null;
  itemCode: string | null;
  sellingPrice: number | string;
  mrp: number | string | null;
  stock: number;
  costPrice: number | null;
  totalCostValue: number;
  repId: string | null;
  rep: { id: string; name: string } | null;
  supplierId: string;
};

type SupplierInfo = {
  id: string;
  name: string;
  contactInfo: string | null;
};

export function SupplierProductsView({
  supplier,
  salesReps,
  products
}: {
  supplier: SupplierInfo;
  salesReps: SalesRepInfo[];
  products: ProductRowItem[];
}) {
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Handle inline Rep change for a product
  const handleInlineRepChange = (productId: string, newRepId: string) => {
    startTransition(async () => {
      await updateProductRepInlineAction(productId, newRepId || null);
    });
  };

  // Filter products by selected rep and search term
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Rep filter
      if (selectedRepFilter === "unassigned") {
        if (p.repId) return false;
      } else if (selectedRepFilter !== "all") {
        if (p.repId !== selectedRepFilter) return false;
      }

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.measurement.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.itemCode && p.itemCode.toLowerCase().includes(q)) ||
        (p.rep && p.rep.name.toLowerCase().includes(q))
      );
    });
  }, [products, selectedRepFilter, search]);

  // Aggregate stats based on the active filtered view
  const activeStockUnits = useMemo(
    () => filteredProducts.reduce((sum, p) => sum + p.stock, 0),
    [filteredProducts]
  );
  const activeStockCostValue = useMemo(
    () => filteredProducts.reduce((sum, p) => sum + p.totalCostValue, 0),
    [filteredProducts]
  );

  // Overall totals across ALL products for this supplier
  const totalAllUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );
  const totalAllCostValue = useMemo(
    () => products.reduce((sum, p) => sum + p.totalCostValue, 0),
    [products]
  );

  // Selected Rep details if a specific rep is selected
  const activeRep = useMemo(
    () => salesReps.find((r) => r.id === selectedRepFilter),
    [salesReps, selectedRepFilter]
  );

  // Unassigned count
  const unassignedCount = useMemo(
    () => products.filter((p) => !p.repId).length,
    [products]
  );

  return (
    <div className="grid gap-5">
      {/* Top Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Total Stock in Hand */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-muted">
                {selectedRepFilter === "all"
                  ? "Total Stock in Hand"
                  : selectedRepFilter === "unassigned"
                  ? "Unassigned Stock in Hand"
                  : `${activeRep?.name ?? "Rep"} Stock in Hand`}
              </h2>
              <div className="mt-2 text-2xl font-semibold tabular text-ink">
                {activeStockUnits.toLocaleString()} units
              </div>
              <div className="mt-1 text-xs text-muted">
                {selectedRepFilter === "all" ? (
                  <>Across {products.length} registered products</>
                ) : (
                  <>
                    {filteredProducts.length} products (out of{" "}
                    {totalAllUnits.toLocaleString()} total units)
                  </>
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eeebe4] text-accent">
              <Boxes size={18} />
            </div>
          </div>
        </Panel>

        {/* Total Stock Value */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-muted">
                {selectedRepFilter === "all"
                  ? "Total Stock Value (Cost)"
                  : selectedRepFilter === "unassigned"
                  ? "Unassigned Stock Value"
                  : `${activeRep?.name ?? "Rep"} Stock Value`}
              </h2>
              <div className="mt-2 text-2xl font-semibold tabular text-accent">
                {money(activeStockCostValue)}
              </div>
              <div className="mt-1 text-xs text-muted">
                {selectedRepFilter === "all" ? (
                  <>Total supplier purchase value in stock</>
                ) : (
                  <>Purchase value for this selection</>
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eeebe4] text-accent">
              <Banknote size={18} />
            </div>
          </div>
        </Panel>

        {/* Sales Representatives Card */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted">Sales Reps</h2>
                <SalesRepDialog
                  suppliers={[{ id: supplier.id, name: supplier.name }]}
                  products={products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    measurement: p.measurement,
                    supplierId: p.supplierId,
                    repId: p.repId
                  }))}
                  defaultSupplierId={supplier.id}
                  trigger={
                    <button
                      type="button"
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      + Add Rep
                    </button>
                  }
                />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular text-ink">
                {salesReps.length} {salesReps.length === 1 ? "Rep" : "Reps"}
              </div>
              <div className="mt-1 text-xs text-muted truncate">
                {salesReps.length === 0 ? (
                  "No reps assigned yet"
                ) : (
                  salesReps.map((r) => r.name).join(", ")
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
              <UserCheck size={18} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 shadow-sm">
        {/* Left: Rep Filter Tabs / Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Filter by Rep:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRepFilter("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                selectedRepFilter === "all"
                  ? "bg-accent text-white shadow-sm"
                  : "border border-line bg-white text-ink hover:bg-slate-50"
              }`}
            >
              All Products ({products.length})
            </button>

            {salesReps.map((rep) => {
              const repProductCount = products.filter((p) => p.repId === rep.id).length;
              const isSelected = selectedRepFilter === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedRepFilter(rep.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "border border-line bg-white text-ink hover:bg-slate-50"
                  }`}
                >
                  <UserCheck size={13} />
                  <span>{rep.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {repProductCount}
                  </span>
                </button>
              );
            })}

            {unassignedCount > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedRepFilter("unassigned")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  selectedRepFilter === "unassigned"
                    ? "bg-amber-700 text-white shadow-sm"
                    : "border border-dashed border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-100/50"
                }`}
              >
                Unassigned ({unassignedCount})
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search className="absolute left-2.5 top-2.5 text-muted" size={14} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, barcode, rep..."
            className="h-9 pl-8 text-xs"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Rep Breakdown Alert Banner (When a specific rep is selected) */}
      {selectedRepFilter !== "all" && activeRep ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-700" />
            <span>
              Showing products managed by <strong>{activeRep.name}</strong>
              {activeRep.phone ? ` (${activeRep.phone})` : ""} — Total:{" "}
              <strong>{activeStockUnits.toLocaleString()} units</strong> (
              <strong>{money(activeStockCostValue)}</strong>)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRepFilter("all")}
            className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
          >
            Show All
          </button>
        </div>
      ) : null}

      {/* Products Table with REP column */}
      <Table
        headers={[
          "Product",
          "Rep",
          "Measurement",
          "Barcode",
          "Cost price",
          "Selling",
          "MRP",
          "Stock",
          "Total value"
        ]}
      >
        {filteredProducts.length === 0 ? (
          <tr>
            <td colSpan={9} className="py-8 text-center text-sm text-muted">
              No products found matching your filter.
            </td>
          </tr>
        ) : (
          filteredProducts.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 font-medium">
                <Link
                  href={`/products/${product.id}`}
                  className="text-ink hover:underline hover:text-accent"
                >
                  {product.name}
                </Link>
              </td>

              {/* REP COLUMN */}
              <td className="px-3 py-2">
                {salesReps.length === 0 ? (
                  <span className="text-xs text-muted">-</span>
                ) : (
                  <select
                    value={product.repId ?? ""}
                    onChange={(e) => handleInlineRepChange(product.id, e.target.value)}
                    disabled={isPending}
                    className={`h-7 rounded border text-xs transition px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      product.rep
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium"
                        : "border-dashed border-slate-300 bg-white text-muted"
                    }`}
                    title="Click to assign or change sales rep"
                  >
                    <option value="">-- No Rep --</option>
                    {salesReps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}
              </td>

              <td className="px-3 py-2">{product.measurement}</td>
              <td className="px-3 py-2 tabular">{product.barcode ?? "-"}</td>
              <td className="px-3 py-2 tabular">
                {product.costPrice !== null ? money(product.costPrice) : "-"}
              </td>
              <td className="px-3 py-2 tabular">{money(product.sellingPrice)}</td>
              <td className="px-3 py-2 tabular">
                {product.mrp ? money(product.mrp) : "-"}
              </td>
              <td className="px-3 py-2 tabular font-semibold">{product.stock}</td>
              <td className="px-3 py-2 tabular font-semibold text-accent">
                {money(product.totalCostValue)}
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
