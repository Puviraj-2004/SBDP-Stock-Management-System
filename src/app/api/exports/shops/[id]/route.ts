import { notFound } from "next/navigation";
import { getInvoicePaidAmount, getShopOutstandingBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { displayDate } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

function cleanFilename(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      invoices: {
        include: { items: { include: { product: true } } },
        orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }]
      },
      payments: {
        include: { allocations: { include: { invoice: true } } },
        orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
      }
    }
  });
  if (!shop) notFound();

  const balance = await getShopOutstandingBalance(shop.id);
  const invoiceRows = await Promise.all(
    shop.invoices.map(async (invoice) => {
      const paid = await getInvoicePaidAmount(invoice.id);
      const total = Number(invoice.totalAmount);
      return [
        `#${invoice.id.slice(0, 6).toUpperCase()}`,
        displayDate(invoice.invoiceDate),
        invoice.items.map((item) => item.product.name).join(", "),
        invoice.items.length,
        total,
        paid,
        Math.max(0, total - paid),
        invoice.paidStatus
      ];
    })
  );

  const paymentRows = shop.payments.map((payment) => [
    displayDate(payment.paymentDate),
    payment.method.replace("_", " "),
    Number(payment.amount),
    payment.method === "cheque" ? payment.chequeStatus ?? "" : "",
    payment.chequeNumber ?? "",
    payment.allocations.map((allocation) => displayDate(allocation.invoice.invoiceDate)).join(", "),
    payment.notes ?? ""
  ]);

  return workbookResponse(`shop-statement-${cleanFilename(shop.name)}.xlsx`, [
    {
      name: "Summary",
      title: `${shop.name} - Shop Statement`,
      subtitle: "Shop details and current outstanding balance",
      columns: ["Shop Name", "Contact Number", "Address", "Current Outstanding Balance"],
      rows: [[shop.name, shop.contactNumber ?? "", shop.address ?? "", balance]]
    },
    {
      name: "Invoice History",
      title: `${shop.name} - Invoice History`,
      subtitle: "All invoices recorded for this selected shop",
      columns: ["Invoice #", "Invoice Date", "Products", "Items", "Total", "Paid", "Remaining", "Status"],
      rows: invoiceRows
    },
    {
      name: "Payment History",
      title: `${shop.name} - Payment History`,
      subtitle: "All payments and invoice allocations recorded for this shop",
      columns: ["Payment Date", "Method", "Amount", "Cheque Status", "Cheque Number", "Allocated Invoice Dates", "Notes"],
      rows: paymentRows
    }
  ]);
}
