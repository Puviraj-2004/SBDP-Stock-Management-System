"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui";

export function MonthFilter({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Input
      aria-label="Pick a month"
      name="month"
      type="month"
      defaultValue={value}
      className="report-date-input"
      onChange={(event) => {
        if (event.target.value) {
          router.push(`/reports/monthly?month=${event.target.value}`);
        }
      }}
    />
  );
}
