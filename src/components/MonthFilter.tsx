"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";

export function MonthFilter({ value, supplierId = "" }: { value: string; supplierId?: string }) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  return (
    <Input
      aria-label="Pick a month"
      name="month"
      type="month"
      value={selected}
      className="report-date-input"
      onChange={(event) => {
        const nextMonth = event.target.value;
        setSelected(nextMonth);
        if (nextMonth) {
          const params = new URLSearchParams({ month: nextMonth });
          if (supplierId) params.set("supplierId", supplierId);
          window.location.assign(`/reports/monthly?${params.toString()}`);
        }
      }}
    />
  );
}
