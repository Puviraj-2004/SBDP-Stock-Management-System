"use client";

import { DatePickerInput } from "@/components/DatePickerInput";

export function ReportDateFilter({ value, supplierId = "" }: { value: string; supplierId?: string }) {
  return (
    <DatePickerInput
      ariaLabel="Pick a date"
      name="date"
      defaultValue={value}
      className="report-date-input"
      onDateChange={(date) => {
        if (!date) return;
        const params = new URLSearchParams({ date });
        if (supplierId) params.set("supplierId", supplierId);
        window.location.assign(`/reports/daily?${params.toString()}`);
      }}
    />
  );
}
