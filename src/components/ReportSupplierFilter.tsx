"use client";

import { useState } from "react";
import { Select } from "@/components/ui";

type SupplierOption = {
  id: string;
  name: string;
};

export function ReportSupplierFilter({
  suppliers,
  selectedSupplierId,
  mode,
  date,
  month
}: {
  suppliers: SupplierOption[];
  selectedSupplierId?: string;
  mode: "daily" | "monthly";
  date?: string;
  month?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <form action={`/reports/${mode}`} method="get" className="report-supplier-filter">
      {mode === "daily" && date ? <input type="hidden" name="date" value={date} /> : null}
      {mode === "monthly" && month ? <input type="hidden" name="month" value={month} /> : null}
      <Select
        aria-label="Filter supplier"
        name="supplierId"
        defaultValue={selectedSupplierId ?? ""}
        className="report-date-input"
        onChange={(event) => {
          setLoading(true);
          event.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="">All suppliers</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </Select>
      {loading ? <span className="report-filter-loading">Loading...</span> : null}
    </form>
  );
}
