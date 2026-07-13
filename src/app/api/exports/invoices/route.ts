import { getInvoicePaidAmount } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { displayDate } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

export async function GET() {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const invoices = await prisma.invoice.findMany({
    include: {
      shop: true,
      vehicle: true,
      items: { include: { product: true } }
    },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }]
  });

  const rows = await Promise.all(
    invoices.map(async (invoice) => {
      const paid = await getInvoicePaidAmount(invoice.id);
      const total = Number(invoice.totalAmount);
      return [
        displayDate(invoice.invoiceDate),
        invoice.shop.name,
        invoice.invoiceType === "opening" ? "Old invoice" : invoice.vehicle?.nameOrNumber ?? "-",
        invoice.items.map((item) => item.product.name).join(", "),
        invoice.items.length,
        total,
        paid,
        Math.max(0, total - paid),
        invoice.paidStatus
      ];
    })
  );

  return workbookResponse("invoices-export.xlsx", [
    {
      name: "Invoices",
      columns: ["Invoice Date", "Shop", "Source", "Products", "Items", "Total", "Paid", "Remaining", "Paid Status"],
      rows
    }
  ]);
}
