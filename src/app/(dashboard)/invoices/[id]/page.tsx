import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Badge, Button, Field, Input, LinkButton, PageHeader, Panel, Select, Table, TextArea } from "@/components/ui";
import {
  clearChequeAction,
  createPaymentAction,
  deleteInvoiceAction,
  deletePaymentAction,
  markInvoicePaidAction,
  updatePaymentAction
} from "@/lib/actions";
import { getInvoicePaidAmount } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      shop: true,
      trip: { include: { vehicle: true } },
      items: { include: { product: { include: { supplier: true } } } },
      allocations: { include: { payment: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!invoice) notFound();

  const paid = await getInvoicePaidAmount(invoice.id);
  const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
  const isOpeningInvoice = invoice.invoiceType === "opening";

  return (
    <>
      <PageHeader
        title={`${isOpeningInvoice ? "Old invoice" : "Invoice"} - ${invoice.shop.name}`}
        description={`${displayDate(invoice.invoiceDate)} - remaining ${money(remaining)}${invoice.referenceNumber ? ` - Ref ${invoice.referenceNumber}` : ""}`}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/shops/${invoice.shopId}`} variant="secondary">Shop account</LinkButton>
            {!isOpeningInvoice && invoice.allocations.length === 0 ? (
              <LinkButton href={`/invoices/${invoice.id}/edit`} variant="secondary">Edit invoice</LinkButton>
            ) : null}
            {invoice.allocations.length === 0 ? (
              <form action={deleteInvoiceAction}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <ConfirmSubmitButton type="submit" message="Delete this invoice?">Delete invoice</ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold">{isOpeningInvoice ? "Old invoice details" : "Line items"}</h2>
            <Badge tone={invoice.paidStatus === "paid" ? "green" : invoice.paidStatus === "partial" ? "amber" : "red"}>{invoice.paidStatus}</Badge>
          </div>

          {isOpeningInvoice ? (
            <div className="rounded-md border border-line bg-white p-4 text-sm">
              <div className="grid gap-2">
                <div><span className="font-medium">Amount:</span> {money(invoice.totalAmount)}</div>
                <div><span className="font-medium">Reference:</span> {invoice.referenceNumber ?? "-"}</div>
                <div><span className="font-medium">Details:</span> {invoice.notes ?? "-"}</div>
              </div>
            </div>
          ) : (
            <>
              <Table headers={["Product", "Supplier", "Qty", "Unit", "Line total"]}>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{item.product.name} {item.product.measurement}</td>
                    <td className="px-3 py-2">{item.product.supplier.name}</td>
                    <td className="px-3 py-2 tabular">{item.quantity}</td>
                    <td className="px-3 py-2 tabular">{money(item.unitPrice)}</td>
                    <td className="px-3 py-2 tabular">{money(item.lineTotal)}</td>
                  </tr>
                ))}
                <tr className="bg-[#ebe7dd] font-semibold">
                  <td className="px-3 py-2" colSpan={4}>Total</td>
                  <td className="px-3 py-2 tabular">{money(invoice.totalAmount)}</td>
                </tr>
              </Table>
              {invoice.trip ? (
                <p className="mt-3 text-sm text-muted">
                  Linked trip: {displayDate(invoice.trip.tripDate)} - {invoice.trip.vehicle.nameOrNumber}
                </p>
              ) : null}
            </>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 font-semibold">Payment</h2>
          {remaining > 0 ? (
            <form action={markInvoicePaidAction} className="mb-4">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <Button type="submit" className="w-full">Mark as paid by cash</Button>
            </form>
          ) : null}
          <form action={createPaymentAction} className="grid gap-3">
            <input type="hidden" name="shopId" value={invoice.shopId} />
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <Field label="Date"><Input name="paymentDate" type="date" defaultValue={toDateInputValue(startOfToday())} required /></Field>
            <Field label="Amount"><Input name="amount" type="number" min="0" step="0.01" defaultValue={remaining || ""} required /></Field>
            <Field label="Method"><Select name="method" required><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option></Select></Field>
            <Field label="Cheque number"><Input name="chequeNumber" /></Field>
            <Field label="Cheque status"><Select name="chequeStatus"><option value="pending">Pending</option><option value="cleared">Cleared</option></Select></Field>
            <Field label="Notes"><TextArea name="notes" /></Field>
            <Button type="submit">Record payment</Button>
          </form>
        </Panel>
      </div>

      <Panel className="mt-5">
        <h2 className="mb-3 font-semibold">Linked payments</h2>
        <Table headers={["Date", "Method", "Payment", "Applied", "Cheque", "Notes", "Action"]}>
          {invoice.allocations.map((allocation) => {
            const payment = allocation.payment;
            return (
              <tr key={allocation.id}>
                <td className="px-3 py-2 tabular">
                  <form id={`payment-${payment.id}`} action={updatePaymentAction} className="grid gap-2">
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <Input name="paymentDate" type="date" defaultValue={toDateInputValue(payment.paymentDate)} className="h-9" required />
                  </form>
                </td>
                <td className="px-3 py-2">
                  <Select name="method" form={`payment-${payment.id}`} defaultValue={payment.method} className="h-9">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                  </Select>
                </td>
                <td className="px-3 py-2 tabular"><Input name="amount" form={`payment-${payment.id}`} type="number" min="0" step="0.01" defaultValue={String(payment.amount)} className="h-9 w-28" required /></td>
                <td className="px-3 py-2 tabular">{money(allocation.amount)}</td>
                <td className="px-3 py-2">
                  <div className="grid gap-2">
                    <Input name="chequeNumber" form={`payment-${payment.id}`} defaultValue={payment.chequeNumber ?? ""} placeholder="No." className="h-9" />
                    <Select name="chequeStatus" form={`payment-${payment.id}`} defaultValue={payment.chequeStatus ?? "pending"} className="h-9">
                      <option value="pending">Pending</option>
                      <option value="cleared">Cleared</option>
                    </Select>
                  </div>
                </td>
                <td className="px-3 py-2"><Input name="notes" form={`payment-${payment.id}`} defaultValue={payment.notes ?? ""} className="h-9" /></td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button form={`payment-${payment.id}`} type="submit" variant="secondary" className="h-9">Save</Button>
                    {payment.method === "cheque" && payment.chequeStatus === "pending" ? (
                      <form action={clearChequeAction}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <Button type="submit" variant="secondary" className="h-9">Clear</Button>
                      </form>
                    ) : null}
                    <form action={deletePaymentAction}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <ConfirmSubmitButton type="submit" message="Delete this full payment and all invoice allocations?" className="h-9">Delete</ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
