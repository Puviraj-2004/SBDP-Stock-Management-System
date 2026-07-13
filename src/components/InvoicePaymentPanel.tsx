"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Badge, Button, Field, Input, Panel, Select, Table, TextArea } from "@/components/ui";
import { createPaymentFormAction, deletePaymentAction, updatePaymentFormAction } from "@/lib/actions";
import { displayDate, money } from "@/lib/dates";

type PaymentRow = {
  allocationId: string;
  appliedAmount: string;
  payment: {
    id: string;
    paymentDate: string;
    method: "cash" | "bank_transfer" | "cheque";
    amount: string;
    chequeNumber: string;
    chequeStatus: "pending" | "cleared" | "";
    notes: string;
  };
};

type EditingPayment = PaymentRow["payment"] | null;

function PaymentFormPanel({
  shopId,
  invoiceId,
  remainingAmount,
  today,
  editingPayment,
  onCancelEdit
}: {
  shopId: string;
  invoiceId: string;
  remainingAmount: string;
  today: string;
  editingPayment: EditingPayment;
  onCancelEdit: () => void;
}) {
  const formKey = editingPayment?.id ?? "new-payment";
  const [actionState, formAction, isPending] = useActionState(
    editingPayment ? updatePaymentFormAction : createPaymentFormAction,
    {}
  );

  const defaults = useMemo(
    () => ({
      paymentDate: editingPayment?.paymentDate ?? today,
      amount: editingPayment?.amount ?? remainingAmount,
      method: editingPayment?.method ?? "cash",
      chequeNumber: editingPayment?.chequeNumber ?? "",
      chequeStatus: editingPayment?.chequeStatus || "pending",
      notes: editingPayment?.notes ?? ""
    }),
    [editingPayment, remainingAmount, today]
  );

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{editingPayment ? "Edit payment" : "Record payment"}</h2>
        {editingPayment ? (
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-8 px-0"
            onClick={onCancelEdit}
            title="Cancel edit"
            aria-label="Cancel edit"
          >
            <X size={15} />
          </Button>
        ) : null}
      </div>
      <form key={formKey} action={formAction} className="grid gap-3">
        <input type="hidden" name="shopId" value={shopId} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        {editingPayment ? <input type="hidden" name="paymentId" value={editingPayment.id} /> : null}
        <Field label="Date">
          <DatePickerInput name="paymentDate" defaultValue={defaults.paymentDate} maxDate={today} required />
        </Field>
        <Field label="Amount">
          <Input name="amount" type="number" min="0" step="0.01" defaultValue={defaults.amount} required />
        </Field>
        <Field label="Method">
          <Select name="method" defaultValue={defaults.method} required>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cheque">Cheque</option>
          </Select>
        </Field>
        <Field label="Cheque number">
          <Input name="chequeNumber" defaultValue={defaults.chequeNumber} />
        </Field>
        <Field label="Cheque status">
          <Select name="chequeStatus" defaultValue={defaults.chequeStatus}>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
          </Select>
        </Field>
        <Field label="Notes">
          <TextArea name="notes" defaultValue={defaults.notes} />
        </Field>
        {actionState.message ? (
          <div className={`rounded-md p-3 text-sm ${actionState.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {actionState.message}
          </div>
        ) : null}
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : editingPayment ? "Update payment" : "Record payment"}</Button>
      </form>
    </Panel>
  );
}

function LinkedPaymentsPanel({
  payments,
  onEdit
}: {
  payments: PaymentRow[];
  onEdit: (payment: PaymentRow["payment"]) => void;
}) {
  return (
    <Panel className="mt-5">
      <h2 className="mb-3 font-semibold">Linked payments</h2>
      {payments.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
          No payments recorded for this invoice.
        </div>
      ) : (
        <Table headers={["Date", "Method", "Payment", "Applied", "Cheque", "Notes", "Actions"]}>
          {payments.map((row) => {
            const payment = row.payment;
            return (
              <tr key={row.allocationId}>
                <td className="px-3 py-2 tabular">{displayDate(payment.paymentDate)}</td>
                <td className="px-3 py-2">{payment.method.replace("_", " ")}</td>
                <td className="px-3 py-2 tabular">{money(payment.amount)}</td>
                <td className="px-3 py-2 tabular">{money(row.appliedAmount)}</td>
                <td className="px-3 py-2">
                  {payment.method === "cheque" ? <Badge tone={payment.chequeStatus === "cleared" ? "green" : "amber"}>{payment.chequeStatus}</Badge> : "-"}
                </td>
                <td className="px-3 py-2">{payment.notes || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 w-8 px-0"
                      title="Edit payment"
                      aria-label="Edit payment"
                      onClick={() => onEdit(payment)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <form action={deletePaymentAction}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <ConfirmSubmitButton
                        type="submit"
                        message="Delete this payment and its invoice allocation?"
                        className="h-8 w-8 px-0"
                        title="Delete payment"
                        aria-label="Delete payment"
                      >
                        <Trash2 size={15} />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </Panel>
  );
}

export function InvoicePaymentSection({
  shopId,
  invoiceId,
  remainingAmount,
  today,
  payments,
  children
}: {
  shopId: string;
  invoiceId: string;
  remainingAmount: string;
  today: string;
  payments: PaymentRow[];
  children: React.ReactNode;
}) {
  const [editingPayment, setEditingPayment] = useState<EditingPayment>(null);

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        {children}
        <PaymentFormPanel
          shopId={shopId}
          invoiceId={invoiceId}
          remainingAmount={remainingAmount}
          today={today}
          editingPayment={editingPayment}
          onCancelEdit={() => setEditingPayment(null)}
        />
      </div>
      <LinkedPaymentsPanel payments={payments} onEdit={setEditingPayment} />
    </>
  );
}
