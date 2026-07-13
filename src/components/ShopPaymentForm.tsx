"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DatePickerInput } from "@/components/DatePickerInput";
import { createPaymentFormAction } from "@/lib/actions";
import { Button, Field, Input, Select, Table, TextArea } from "@/components/ui";

type InvoiceOption = {
  id: string;
  date: string;
  amountLabel: string;
  remainingLabel: string;
  remaining: number;
  status: string;
};

export function ShopPaymentForm({
  shopId,
  defaultAmount,
  today,
  invoices
}: {
  shopId: string;
  defaultAmount: string;
  today: string;
  invoices: InvoiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(createPaymentFormAction, {});

  useEffect(() => {
    if (actionState.ok) setOpen(false);
  }, [actionState.ok]);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="shopId" value={shopId} />
      <Field label="Date">
        <DatePickerInput name="paymentDate" defaultValue={today} maxDate={today} required />
      </Field>
      <Field label="Amount">
        <Input name="amount" type="number" min="0" step="0.01" defaultValue={defaultAmount} required />
      </Field>
      <Field label="Method">
        <Select name="method" required>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cheque">Cheque</option>
        </Select>
      </Field>
      <Field label="Cheque number">
        <Input name="chequeNumber" />
      </Field>
      <Field label="Cheque status">
        <Select name="chequeStatus">
          <option value="pending">Pending</option>
          <option value="cleared">Cleared</option>
        </Select>
      </Field>
      <Field label="Notes">
        <TextArea name="notes" />
      </Field>

      <Button type="button" onClick={() => setOpen(true)}>Record payment</Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border border-line bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Apply payment to invoices</h2>
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setOpen(false)} aria-label="Close">
                <X size={17} />
              </Button>
            </div>

            {invoices.length > 0 ? (
              <Table headers={["Pay", "Date", "Amount", "Remaining", "Status"]}>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-3 py-2">
                      <input name="allocateInvoiceId" type="checkbox" value={invoice.id} className="h-4 w-4 accent-accent" />
                    </td>
                    <td className="px-3 py-2 tabular">{invoice.date}</td>
                    <td className="px-3 py-2 tabular">{invoice.amountLabel}</td>
                    <td className="px-3 py-2 tabular">{invoice.remainingLabel}</td>
                    <td className="px-3 py-2">{invoice.status}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
                No unpaid invoices for this shop.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {actionState.message ? (
                <div className={`mr-auto rounded-md p-3 text-sm ${actionState.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                  {actionState.message}
                </div>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Confirm payment"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
