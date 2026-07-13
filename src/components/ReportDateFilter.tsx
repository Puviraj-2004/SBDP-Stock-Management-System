"use client";

import { useRouter } from "next/navigation";
import { DatePickerInput } from "@/components/DatePickerInput";

export function ReportDateFilter({ value }: { value: string }) {
  const router = useRouter();

  return (
    <DatePickerInput
      aria-label="Pick a date"
      name="date"
      defaultValue={value}
      className="report-date-input"
      onDateChange={(date) => {
        if (date) router.push(`/reports/daily?date=${date}`);
      }}
    />
  );
}
