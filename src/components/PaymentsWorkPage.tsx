"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Banknote, Building2, FileText, Plus, X } from "lucide-react";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Badge, Button, Field, Input, Panel, Select, Table, TextArea } from "@/components/ui";
import { clearChequeAction, createPaymentFormAction } from "@/lib/actions";
import { displayDate, money } from "@/lib/dates";

type ShopOption = {
  id: string;
  name: string;
};

type InvoiceOption = {
  id: string;
  shopId: string;
  label: string;
  dateLabel: string;
  remaining: number;
};

type PendingCheque = {
  id: string;
  paymentDate: string;
  shopName: string;
  chequeNumber: string;
  amount: string;
};

type PaymentRow = {
  id: string;
  paymentDate: string;
  shopName: string;
  amount: string;
  method: "cash" | "bank_transfer" | "cheque";
  chequeStatus: "pending" | "cleared" | null;
  allocations: {
    id: string;
    invoiceId: string;
    label: string;
    amount: string;
    isFull: boolean;
  }[];
};

function MethodIcon({ method }: { method: PaymentRow["method"] }) {
  const Icon = method === "cash" ? Banknote : method === "bank_transfer" ? Building2 : FileText;
  return <Icon size={15} className="shrink-0 text-muted" />;
}

function methodLabel(method: PaymentRow["method"]) {
  if (method === "bank_transfer") return "Bank";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function PendingChequesSection({ rows }: { rows: PendingCheque[] }) {
  const [pendingRows, setPendingRows] = useState(rows);
  const [, startTransition] = useTransition();

  if (pendingRows.length === 0) return null;

  return (
    <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-amber-950">Pending cheques</h2>
          <p className="mt-1 text-sm text-amber-800">Cheque payments not realized yet.</p>
        </div>
        <Badge tone="amber">{pendingRows.length}</Badge>
      </div>
      <Table headers={["Date", "Shop", "Cheque number", "Amount", "Action"]}>
        {pendingRows.map((payment) => (
          <tr key={payment.id}>
            <td className="px-3 py-2 tabular">{displayDate(payment.paymentDate)}</td>
            <td className="px-3 py-2">{payment.shopName}</td>
            <td className="px-3 py-2">{payment.chequeNumber}</td>
            <td className="px-3 py-2 tabular">{money(payment.amount)}</td>
            <td className="px-3 py-2">
              <form
                action={(formData) => {
                  setPendingRows((current) => current.filter((row) => row.id !== payment.id));
                  startTransition(() => {
                    clearChequeAction(formData);
                  });
                }}
              >
                <input type="hidden" name="paymentId" value={payment.id} />
                <Button type="submit" variant="secondary" className="h-8">Clear</Button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

function AddPaymentDialog({
  shops,
  invoices,
  today,
  onClose
}: {
  shops: ShopOption[];
  invoices: InvoiceOption[];
  today: string;
  onClose: () => void;
}) {
  const [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [checkedInvoices, setCheckedInvoices] = useState<Record<string, boolean>>({});
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>({});
  const [actionState, formAction, isPending] = useActionState(createPaymentFormAction, {});

  useEffect(() => {
    if (actionState.ok) onClose();
  }, [actionState.ok, onClose]);

  const shopInvoices = useMemo(() => invoices.filter((invoice) => invoice.shopId === shopId), [invoices, shopId]);
  const allocatedTotal = shopInvoices.reduce((sum, invoice) => {
    if (!checkedInvoices[invoice.id]) return sum;
    return sum + Number(allocationAmounts[invoice.id] || 0);
  }, 0);
  const paymentAmount = Number(amount || 0);
  const allocationTooHigh = allocatedTotal > paymentAmount;

  function toggleInvoice(invoice: InvoiceOption, checked: boolean) {
    setCheckedInvoices((current) => ({ ...current, [invoice.id]: checked }));
    setAllocationAmounts((current) => ({
      ...current,
      [invoice.id]: current[invoice.id] || String(invoice.remaining)
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-line bg-[#f7f4ee] p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Add payment</h2>
          <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Payment date">
              <DatePickerInput name="paymentDate" defaultValue={today} maxDate={today} required />
            </Field>
            <Field label="Amount">
              <Input name="amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </Field>
          </div>
          <div className="grid gap-3">
            <Field label="Shop">
              <Select
                name="shopId"
                value={shopId}
                onChange={(event) => {
                  setShopId(event.target.value);
                  setCheckedInvoices({});
                  setAllocationAmounts({});
                }}
                required
              >
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Method">
              <Select name="method" value={method} onChange={(event) => setMethod(event.target.value)} required>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
              </Select>
            </Field>
            {method === "cheque" ? (
              <Field label="Cheque number">
                <Input name="chequeNumber" required />
              </Field>
            ) : null}
          </div>
          {method === "cheque" ? <input type="hidden" name="chequeStatus" value="pending" /> : null}
          <Field label="Notes">
            <TextArea name="notes" />
          </Field>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Allocate invoices</h3>
              <div className={allocationTooHigh ? "text-sm font-medium text-red-700" : "text-sm text-muted"}>
                Allocated {money(allocatedTotal)} / Payment {money(paymentAmount)}
              </div>
            </div>
            {!shopId ? (
              <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">Select a shop to see unpaid invoices.</div>
            ) : shopInvoices.length === 0 ? (
              <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">No unpaid or partial invoices for this shop.</div>
            ) : (
              <Table headers={["Pay", "Invoice", "Remaining", "Allocate"]}>
                {shopInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-3 py-2">
                      <input
                        name="allocateInvoiceId"
                        type="checkbox"
                        value={invoice.id}
                        checked={Boolean(checkedInvoices[invoice.id])}
                        onChange={(event) => toggleInvoice(invoice, event.target.checked)}
                        className="h-4 w-4 accent-accent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div>{invoice.label}</div>
                      <div className="text-xs text-muted">{invoice.dateLabel}</div>
                    </td>
                    <td className="px-3 py-2 tabular">{money(invoice.remaining)}</td>
                    <td className="px-3 py-2">
                      <Input
                        name={`allocationAmount-${invoice.id}`}
                        type="number"
                        min="0"
                        max={invoice.remaining}
                        step="0.01"
                        value={allocationAmounts[invoice.id] ?? ""}
                        disabled={!checkedInvoices[invoice.id]}
                        onChange={(event) => setAllocationAmounts((current) => ({ ...current, [invoice.id]: event.target.value }))}
                        className="h-9 w-32"
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {actionState.message ? (
              <div className={`mr-auto rounded-md p-3 text-sm ${actionState.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                {actionState.message}
              </div>
            ) : null}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={!shopId || allocationTooHigh || isPending}>{isPending ? "Saving..." : "Save payment"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentsWorkPage({
  payments,
  pendingCheques,
  shops,
  invoices,
  today
}: {
  payments: PaymentRow[];
  pendingCheques: PendingCheque[];
  shops: ShopOption[];
  invoices: InvoiceOption[];
  today: string;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="grid gap-5">
      <PendingChequesSection rows={pendingCheques} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">All payments</h2>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add payment
        </Button>
      </div>

      <Table headers={["Date", "Shop", "Amount", "Method", "Allocated invoices", "Status"]}>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <td className="px-3 py-2 tabular">{displayDate(payment.paymentDate)}</td>
            <td className="px-3 py-2">{payment.shopName}</td>
            <td className="px-3 py-2 tabular">{money(payment.amount)}</td>
            <td className="px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <MethodIcon method={payment.method} />
                {methodLabel(payment.method)}
              </span>
            </td>
            <td className="px-3 py-2">
              {payment.allocations.length === 0 ? (
                <span className="text-muted">Unallocated</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {payment.allocations.map((allocation) => (
                    <Link key={allocation.id} href={`/invoices/${allocation.invoiceId}`} className="text-accent underline-offset-2 hover:underline">
                      {allocation.label} ({allocation.isFull ? "full" : "partial"})
                    </Link>
                  ))}
                </div>
              )}
            </td>
            <td className="px-3 py-2">
              {payment.method === "cheque" ? (
                <Badge tone={payment.chequeStatus === "cleared" ? "green" : "amber"}>{payment.chequeStatus === "cleared" ? "Cleared" : "Pending"}</Badge>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>

      {addOpen ? <AddPaymentDialog shops={shops} invoices={invoices} today={today} onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
