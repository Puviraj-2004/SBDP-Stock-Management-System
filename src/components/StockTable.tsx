"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteBatchAction } from "@/lib/actions";
import { Badge, Input, Select, Table } from "@/components/ui";
import { displayDate } from "@/lib/dates";

type StockRow = {
  id: string;
  productName: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  quantity: number;
  receivedDate: string;
  expiryDate: string;
  tripItemCount: number;
};

export function StockTable({
  rows,
  today,
  soon
}: {
  rows: StockRow[];
  today: string;
  soon: string;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) => {
      const expired = row.expiryDate < today;
      const expiring = !expired && row.expiryDate <= soon;
      const available = row.quantity > 0 && !expired;

      const stateMatch =
        !state ||
        (state === "available" && available) ||
        (state === "expiring" && row.quantity > 0 && expiring) ||
        (state === "expired" && row.quantity > 0 && expired);

      if (!stateMatch) return false;
      if (!normalized) return true;

      return [row.productName, row.measurement, row.supplierName, row.barcode, row.itemCode]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [query, rows, soon, state, today]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_180px]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, supplier, barcode, or item code"
        />
        <Select value={state} onChange={(event) => setState(event.target.value)}>
          <option value="">All batches</option>
          <option value="available">Available only</option>
          <option value="expiring">Expiring soon</option>
          <option value="expired">Expired with stock</option>
        </Select>
      </div>

      <Table headers={["Product", "Supplier", "Barcode", "Batch qty", "Received", "Expiry", "State", "Actions"]}>
        {filteredRows.map((row) => {
          const expired = row.expiryDate < today;
          const expiring = !expired && row.expiryDate <= soon;

          return (
            <tr key={row.id} className={expired ? "bg-red-50" : expiring ? "bg-amber-50" : undefined}>
              <td className="px-3 py-2 font-medium">
                {row.productName} {row.measurement}
              </td>
              <td className="px-3 py-2">{row.supplierName}</td>
              <td className="px-3 py-2 tabular">{row.barcode ?? row.itemCode ?? "-"}</td>
              <td className="px-3 py-2 tabular">{row.quantity}</td>
              <td className="px-3 py-2 tabular">{displayDate(row.receivedDate)}</td>
              <td className="px-3 py-2 tabular">{displayDate(row.expiryDate)}</td>
              <td className="px-3 py-2">
                {expired ? (
                  <Badge tone="red">expired</Badge>
                ) : expiring ? (
                  <Badge tone="amber">expiring soon</Badge>
                ) : (
                  <Badge tone="green">available</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/stock/batches/${row.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                    title="Edit batch"
                    aria-label={`Edit ${row.productName}`}
                  >
                    <Edit size={15} />
                  </Link>
                  {row.tripItemCount === 0 ? (
                    <form action={deleteBatchAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmSubmitButton
                        type="submit"
                        message={`Delete batch for ${row.productName}?`}
                        className="h-8 w-8 px-0"
                        title="Delete batch"
                        aria-label={`Delete ${row.productName}`}
                      >
                        <Trash2 size={15} />
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>

      {filteredRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
          No stock batches match this filter.
        </div>
      ) : null}
    </div>
  );
}
