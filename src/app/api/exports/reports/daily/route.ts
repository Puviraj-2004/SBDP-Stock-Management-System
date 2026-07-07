import { getDailyProgress } from "@/lib/dailyReport";
import { displayDate, money } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

export async function GET(request: Request) {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const report = await getDailyProgress(url.searchParams.get("date") ?? undefined);

  return workbookResponse(`daily-report-${report.selected}.xlsx`, [
    {
      name: "Summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Date", displayDate(report.selected)],
        ["Sales", money(report.totals.invoiceValue)],
        ["Collections", money(report.totals.countedPaymentValue)],
        ["Trips", report.totals.trips],
        ["Open Trips", report.totals.openTrips],
        ["Closed Trips", report.totals.closedTrips],
        ["Units Loaded", report.totals.loaded],
        ["Units Returned", report.totals.returned],
        ["Expected Sold", report.totals.expectedSold],
        ["Invoices", report.totals.invoices],
        ["Payments", report.totals.payments],
        ["Pending Cheques", money(report.totals.pendingChequeValue)],
        ["Net Outstanding", money(report.totals.totalOutstanding)]
      ]
    },
    {
      name: "Trips",
      columns: ["Vehicle", "Supplier", "Loaded", "Returned", "Expected Sold", "Invoices", "Invoice Value", "Status", "Mismatch Count"],
      rows: report.trips.map((trip) => [
        trip.vehicle,
        trip.supplier,
        trip.loaded,
        trip.returned,
        trip.expectedSold,
        trip.invoiceCount,
        trip.invoiceValue,
        trip.status,
        trip.mismatchCount
      ])
    },
    {
      name: "Stock Received",
      columns: ["Product", "Measurement", "Supplier", "Qty", "Received Date", "Expiry Date"],
      rows: report.stockReceived.map((batch) => [
        batch.product.name,
        batch.product.measurement,
        batch.product.supplier.name,
        batch.quantity,
        displayDate(batch.receivedDate),
        displayDate(batch.expiryDate)
      ])
    },
    {
      name: "Invoices",
      columns: ["Invoice Date", "Shop", "Products", "Total", "Status"],
      rows: report.invoices.map((invoice) => [
        displayDate(invoice.invoiceDate),
        invoice.shop.name,
        invoice.items.map((item) => item.product.name).join(", "),
        Number(invoice.totalAmount),
        invoice.paidStatus
      ])
    },
    {
      name: "Payments",
      columns: ["Payment Date", "Shop", "Method", "Amount", "Cheque Status", "Allocated Amount"],
      rows: report.payments.map((payment) => [
        displayDate(payment.paymentDate),
        payment.shop.name,
        payment.method.replace("_", " "),
        Number(payment.amount),
        payment.method === "cheque" ? payment.chequeStatus ?? "" : "",
        payment.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0)
      ])
    },
    {
      name: "Alerts",
      columns: ["Severity", "Message", "Info"],
      rows: report.alerts.map((alert) => [alert.severity, alert.message, alert.meta])
    }
  ]);
}
