"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { deleteShopAction } from "@/lib/actions";
import { Input, Select, Table } from "@/components/ui";

type ShopRow = {
  id: string;
  name: string;
  contactNumber: string | null;
  address: string | null;
  invoiceCount: number;
  paymentCount: number;
  balance: number;
  balanceLabel: string;
};

export function ShopsTable({ rows }: { rows: ShopRow[] }) {
  const [query, setQuery] = useState("");
  const [balanceState, setBalanceState] = useState("");
  const [activityState, setActivityState] = useState("");
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((row) =>
      {
        if (balanceState === "outstanding" && row.balance <= 0) return false;
        if (balanceState === "clear" && row.balance !== 0) return false;
        if (balanceState === "advance" && row.balance >= 0) return false;
        if (activityState === "with_invoices" && row.invoiceCount === 0) return false;
        if (activityState === "with_payments" && row.paymentCount === 0) return false;
        if (!normalized) return true;

        return [row.name, row.contactNumber, row.address]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalized));
      }
    );
  }, [activityState, balanceState, query, rows]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search shops by name, contact, or address"
        />
        <Select value={balanceState} onChange={(event) => setBalanceState(event.target.value)}>
          <option value="">All balances</option>
          <option value="outstanding">Outstanding</option>
          <option value="clear">Clear balance</option>
          <option value="advance">Advance paid</option>
        </Select>
        <Select value={activityState} onChange={(event) => setActivityState(event.target.value)}>
          <option value="">All activity</option>
          <option value="with_invoices">With invoices</option>
          <option value="with_payments">With payments</option>
        </Select>
      </div>
      <Table headers={["Shop", "Contact", "Invoices", "Payments", "Outstanding", "Actions"]}>
        {filteredRows.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2 font-medium">{row.name}</td>
            <td className="px-3 py-2">{row.contactNumber ?? "-"}</td>
            <td className="px-3 py-2 tabular">{row.invoiceCount}</td>
            <td className="px-3 py-2 tabular">{row.paymentCount}</td>
            <td className={`px-3 py-2 tabular ${row.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {row.balanceLabel}
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/shops/${row.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                  title="View shop details"
                  aria-label={`View ${row.name}`}
                >
                  <Eye size={15} />
                </Link>
                <Link
                  href={`/shops/${row.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                  title="Edit shop"
                  aria-label={`Edit ${row.name}`}
                >
                  <Edit size={15} />
                </Link>
                {row.invoiceCount === 0 && row.paymentCount === 0 ? (
                  <form action={deleteShopAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmSubmitButton
                      type="submit"
                      message={`Delete ${row.name}?`}
                      className="h-8 w-8 px-0"
                      title="Delete shop"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={15} />
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {filteredRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
          No shops match this search.
        </div>
      ) : null}
    </div>
  );
}
