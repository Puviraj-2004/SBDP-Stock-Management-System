import Link from "next/link";
import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/ExportButton";
import { Badge, Button, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { ShopBalanceCard } from "@/components/ShopBalanceCard";
import { ShopPaymentForm } from "@/components/ShopPaymentForm";
import { clearChequeAction } from "@/lib/actions";
import { getInvoicePaidAmount, getShopOutstandingBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { displayDate, money, toDateInputValue } from "@/lib/dates";

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { invoiceDate: "desc" } },
      payments: {
        include: {
          allocations: { include: { invoice: true }, orderBy: { createdAt: "asc" } }
        },
        orderBy: { paymentDate: "desc" }
      }
    }
  });
  if (!shop) notFound();
  const balance = await getShopOutstandingBalance(shop.id);
  const invoicePaymentRows = await Promise.all(
    shop.invoices.map(async (invoice) => {
      const paid = await getInvoicePaidAmount(invoice.id);
      const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
      return {
        id: invoice.id,
        date: displayDate(invoice.invoiceDate),
        amountLabel: money(invoice.totalAmount),
        remainingLabel: money(remaining),
        remaining,
        status: invoice.paidStatus
      };
    })
  );
  const payableInvoices = invoicePaymentRows.filter((invoice) => invoice.remaining > 0);

  return (
    <>
      <PageHeader
        title={shop.name}
        description={[shop.contactNumber, shop.address].filter(Boolean).join(" · ") || "Shop account"}
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/api/exports/shops/${shop.id}`}>Export Statement</ExportButton>
            <LinkButton href={`/invoices/old?shopId=${shop.id}`} variant="secondary">Add old invoice</LinkButton>
            <LinkButton href={`/shops/${shop.id}/edit`} variant="secondary">Edit shop</LinkButton>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="grid gap-5">
          <ShopBalanceCard balance={balance} />
          <Panel>
            <h2 className="mb-3 font-semibold">Add payment</h2>
            <ShopPaymentForm
              shopId={shop.id}
              defaultAmount={balance > 0 ? String(balance) : ""}
              today={toDateInputValue(new Date())}
              invoices={payableInvoices}
            />
          </Panel>
        </div>
        <Panel>
          <h2 className="mb-3 font-semibold">Invoice history</h2>
          <Table headers={["Date", "Amount", "Status", "Action"]}>
            {shop.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-3 py-2 tabular">{displayDate(invoice.invoiceDate)}</td>
                <td className="px-3 py-2 tabular">
                  <div>{money(invoice.totalAmount)}</div>
                  {invoice.invoiceType === "opening" ? <div className="text-xs text-muted">Old invoice{invoice.referenceNumber ? ` - ${invoice.referenceNumber}` : ""}</div> : null}
                </td>
                <td className="px-3 py-2"><Badge tone={invoice.paidStatus === "paid" ? "green" : invoice.paidStatus === "partial" ? "amber" : "red"}>{invoice.paidStatus}</Badge></td>
                <td className="px-3 py-2">
                  <Link href={`/invoices/${invoice.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View invoice" aria-label="View invoice">
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel className="mt-5">
        <h2 className="mb-3 font-semibold">Payment history</h2>
        <Table headers={["Date", "Source", "Method", "Amount", "Cheque", "Notes", "Action"]}>
          {shop.payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-3 py-2 tabular">{displayDate(payment.paymentDate)}</td>
              <td className="px-3 py-2">
                {payment.allocations.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {payment.allocations.map((allocation) => (
                      <span key={allocation.id} className="inline-flex items-center gap-1">
                        <Badge tone="neutral">{money(allocation.amount)}</Badge>
                        <Link href={`/invoices/${allocation.invoice.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View invoice" aria-label="View invoice">
                          <Eye size={15} />
                        </Link>
                      </span>
                    ))}
                  </div>
                ) : (
                  <Badge tone={payment.method === "cheque" && payment.chequeStatus === "pending" ? "amber" : "green"}>
                    {payment.method === "cheque" && payment.chequeStatus === "pending" ? "pending" : "unallocated"}
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2">{payment.method.replace("_", " ")}</td>
              <td className="px-3 py-2 tabular">{money(payment.amount)}</td>
              <td className="px-3 py-2">
                {payment.method === "cheque" ? <Badge tone={payment.chequeStatus === "cleared" ? "green" : "amber"}>{payment.chequeStatus}</Badge> : "-"}
              </td>
              <td className="px-3 py-2">{payment.notes ?? "-"}</td>
              <td className="px-3 py-2">
                {payment.method === "cheque" && payment.chequeStatus === "pending" ? (
                  <form action={clearChequeAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <Button type="submit" variant="secondary" className="h-8">Clear</Button>
                  </form>
                ) : "-"}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
