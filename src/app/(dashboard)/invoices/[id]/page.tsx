import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { InvoicePaymentSection } from "@/components/InvoicePaymentPanel";
import { Badge, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { deleteInvoiceAction } from "@/lib/actions";
import { getInvoicePaidAmount } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      shop: true,
      vehicle: true,
      items: { include: { product: { include: { supplier: true } }, batch: true } },
      allocations: { include: { payment: true }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!invoice) notFound();

  const paid = await getInvoicePaidAmount(invoice.id);
  const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
  const isOpeningInvoice = invoice.invoiceType === "opening";
  const paymentRows = invoice.allocations.map((allocation) => ({
    allocationId: allocation.id,
    appliedAmount: String(allocation.amount),
    payment: {
      id: allocation.payment.id,
      paymentDate: toDateInputValue(allocation.payment.paymentDate),
      method: allocation.payment.method,
      amount: String(allocation.payment.amount),
      chequeNumber: allocation.payment.chequeNumber ?? "",
      chequeStatus: (allocation.payment.chequeStatus === "pending" || allocation.payment.chequeStatus === "cleared" ? allocation.payment.chequeStatus : "") as "" | "pending" | "cleared",
      notes: allocation.payment.notes ?? ""
    }
  }));
  const allocatedPaymentIds = new Set(paymentRows.map((row) => row.payment.id));
  const directPaymentRows = invoice.payments
    .filter((payment) => !allocatedPaymentIds.has(payment.id))
    .map((payment) => ({
      allocationId: `payment-${payment.id}`,
      appliedAmount: "0",
      payment: {
        id: payment.id,
        paymentDate: toDateInputValue(payment.paymentDate),
        method: payment.method,
        amount: String(payment.amount),
        chequeNumber: payment.chequeNumber ?? "",
        chequeStatus: (payment.chequeStatus === "pending" || payment.chequeStatus === "cleared" ? payment.chequeStatus : "") as "" | "pending" | "cleared",
        notes: payment.notes ?? ""
      }
    }));
  const visiblePaymentRows = [...paymentRows, ...directPaymentRows];

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
      <InvoicePaymentSection
        shopId={invoice.shopId}
        invoiceId={invoice.id}
        remainingAmount={remaining > 0 ? String(remaining) : ""}
        today={toDateInputValue(startOfToday())}
        payments={visiblePaymentRows}
      >
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
              {invoice.vehicle ? (
                <p className="mt-3 text-sm text-muted">
                  Vehicle: {invoice.vehicle.nameOrNumber}
                </p>
              ) : null}
            </>
          )}
        </Panel>
      </InvoicePaymentSection>
    </>
  );
}
