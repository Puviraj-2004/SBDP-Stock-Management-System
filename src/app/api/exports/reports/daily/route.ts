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
      name: "Daily Report",
      title: `Daily Report - ${displayDate(report.selected)}`,
      columns: ["Section", "Metric", "Value"],
      rows: [
        ["Summary", "Total Sales", money(report.totals.sales)],
        ["Summary", "Gross Profit", money(report.totals.profit)],
        ["Summary", "Payments Received", money(report.totals.paymentsReceived)],
        ["Summary", "Units Loaded", report.totals.loadedUnits],
        ["Summary", "Vehicles Loaded", report.totals.loadedVehicles],
        ["Summary", "Units Sold", report.totals.soldUnits],
        ["Summary", "Units Returned", report.totals.returnedUnits],
        ["Summary", "New Pending Cheques", money(report.totals.pendingChequeValue)],
        ...report.vehicleRows.map((row) => ["Vehicle", `${row.vehicle} loaded/sold/returned/balance`, `${row.loaded} / ${row.sold} / ${row.returned} / ${row.currentBalance}`]),
        ...report.invoices.map((invoice) => ["Invoice", `${invoice.shop} - ${invoice.vehicle}`, `${money(invoice.amount)} - ${invoice.status}`]),
        ...report.payments.map((payment) => ["Payment", `${payment.shop} - ${payment.method.replace("_", " ")}`, money(payment.amount)])
      ]
    }
  ]);
}
