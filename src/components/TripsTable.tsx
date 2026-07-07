"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Badge, Input, Select, Table } from "@/components/ui";
import { cancelOpenTripAction } from "@/lib/actions";
import { displayDate } from "@/lib/dates";

type TripRow = {
  id: string;
  date: string;
  vehicle: string;
  supplier: string;
  itemCount: number;
  invoiceCount: number;
  status: "loaded" | "closed";
};

export function TripsTable({ rows }: { rows: TripRow[] }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [invoiceState, setInvoiceState] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (date && row.date !== date) return false;
      if (status && row.status !== status) return false;
      if (invoiceState === "with_invoices" && row.invoiceCount === 0) return false;
      if (invoiceState === "without_invoices" && row.invoiceCount > 0) return false;
      if (!normalized) return true;

      return [row.vehicle, row.supplier].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [date, invoiceState, query, rows, status]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_170px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle or supplier" />
        <Input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="loaded">Loaded</option>
          <option value="closed">Closed</option>
        </Select>
        <Select value={invoiceState} onChange={(event) => setInvoiceState(event.target.value)}>
          <option value="">All invoices</option>
          <option value="with_invoices">With invoices</option>
          <option value="without_invoices">No invoices</option>
        </Select>
      </div>

      <Table headers={["Date", "Vehicle", "Supplier ref", "Items", "Invoices", "Status", "Actions"]}>
        {filteredRows.map((trip) => (
          <tr key={trip.id}>
            <td className="px-3 py-2 tabular">{displayDate(trip.date)}</td>
            <td className="px-3 py-2">{trip.vehicle}</td>
            <td className="px-3 py-2">{trip.supplier}</td>
            <td className="px-3 py-2 tabular">{trip.itemCount}</td>
            <td className="px-3 py-2 tabular">{trip.invoiceCount}</td>
            <td className="px-3 py-2"><Badge tone={trip.status === "closed" ? "green" : "amber"}>{trip.status}</Badge></td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/trips/${trip.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View trip" aria-label="View trip">
                  <Eye size={15} />
                </Link>
                {trip.status === "loaded" ? (
                  <Link href={`/trips/${trip.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="Edit trip" aria-label="Edit trip">
                    <Edit size={15} />
                  </Link>
                ) : null}
                {trip.status === "loaded" && trip.invoiceCount === 0 ? (
                  <form action={cancelOpenTripAction}>
                    <input type="hidden" name="id" value={trip.id} />
                    <ConfirmSubmitButton type="submit" message="Cancel this trip and return loaded stock?" className="h-8 w-8 px-0" title="Cancel trip" aria-label="Cancel trip">
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
