"use client";

import { useRouter } from "next/navigation";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Input, Panel, Select } from "@/components/ui";

function nextHref(values: { method: string; from: string; to: string; shop: string }) {
  const params = new URLSearchParams();
  if (values.method) params.set("method", values.method);
  if (values.from) params.set("from", values.from);
  if (values.to) params.set("to", values.to);
  if (values.shop.trim()) params.set("shop", values.shop.trim());
  const query = params.toString();
  return query ? `/payments?${query}` : "/payments";
}

export function PaymentsFilterBar({
  method,
  from,
  to,
  shop
}: {
  method: string;
  from: string;
  to: string;
  shop: string;
}) {
  const router = useRouter();

  function update(next: Partial<{ method: string; from: string; to: string; shop: string }>) {
    router.push(nextHref({ method, from, to, shop, ...next }));
  }

  return (
    <Panel className="mb-5">
      <div className="grid gap-3 lg:grid-cols-[180px_180px_180px_1fr]">
        <Select value={method} onChange={(event) => update({ method: event.target.value })}>
          <option value="">All methods</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cheque">Cheque</option>
        </Select>
        <DatePickerInput defaultValue={from} onDateChange={(date) => update({ from: date })} ariaLabel="From date" />
        <DatePickerInput defaultValue={to} onDateChange={(date) => update({ to: date })} ariaLabel="To date" />
        <Input
          defaultValue={shop}
          placeholder="Search shop"
          onChange={(event) => update({ shop: event.target.value })}
        />
      </div>
    </Panel>
  );
}
