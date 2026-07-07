"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui";

export function ReportDateFilter({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Input
      aria-label="Pick a date"
      name="date"
      type="date"
      defaultValue={value}
      className="report-date-input"
      onChange={(event) => {
        if (event.target.value) {
          router.push(`/reports?date=${event.target.value}`);
        }
      }}
    />
  );
}
