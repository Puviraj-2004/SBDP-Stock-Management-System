"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Badge, Input, Select, Table } from "@/components/ui";
import { deleteInvoiceAction } from "@/lib/actions";
import { displayDate } from "@/lib/dates";

type InvoiceRow = {
  id: string;
  date: string;
  shopName: string;
  tripLabel: string;
  itemCount: number;
  amountLabel: string;
  allocationCount: number;
  paidStatus: "paid" | "partial" | "unpaid";
};

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [tripState, setTripState] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && row.paidStatus !== status) return false;
      if (date && row.date !== date) return false;
      if (tripState === "linked" && row.tripLabel === "-") return false;
      if (tripState === "not_linked" && row.tripLabel !== "-") return false;
      if (!normalized) return true;

      return [row.shopName, row.tripLabel, row.amountLabel].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [date, query, rows, status, tripState]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_160px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shop, trip, or amount" />
        <Input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </Select>
        <Select value={tripState} onChange={(event) => setTripState(event.target.value)}>
          <option value="">All trips</option>
          <option value="linked">Linked trip</option>
          <option value="not_linked">No trip</option>
        </Select>
      </div>

      <Table headers={["Date", "Shop", "Trip", "Items", "Amount", "Payments", "Status", "Actions"]}>
        {filteredRows.map((invoice) => (
          <tr key={invoice.id}>
            <td className="px-3 py-2 tabular">{displayDate(invoice.date)}</td>
            <td className="px-3 py-2">{invoice.shopName}</td>
            <td className="px-3 py-2">{invoice.tripLabel}</td>
            <td className="px-3 py-2 tabular">{invoice.itemCount}</td>
            <td className="px-3 py-2 tabular">{invoice.amountLabel}</td>
            <td className="px-3 py-2 tabular">{invoice.allocationCount}</td>
            <td className="px-3 py-2">
              <Badge tone={invoice.paidStatus === "paid" ? "green" : invoice.paidStatus === "partial" ? "amber" : "red"}>{invoice.paidStatus}</Badge>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/invoices/${invoice.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View invoice" aria-label="View invoice">
                  <Eye size={15} />
                </Link>
                {invoice.allocationCount === 0 ? (
                  <Link href={`/invoices/${invoice.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="Edit invoice" aria-label="Edit invoice">
                    <Edit size={15} />
                  </Link>
                ) : null}
                {invoice.allocationCount === 0 ? (
                  <form action={deleteInvoiceAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <ConfirmSubmitButton type="submit" message="Delete this invoice?" className="h-8 w-8 px-0" title="Delete invoice" aria-label="Delete invoice">
                      <Trash2 size={15} />
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
