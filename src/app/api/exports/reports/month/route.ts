import { getMonthlyProgress } from "@/lib/monthlyReport";
import { displayDate, money } from "@/lib/dates";
import { workbookResponse } from "@/lib/excel";
import { requireExportOwner } from "@/lib/exportAuth";

export async function GET(request: Request) {
  const unauthorized = await requireExportOwner();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const report = await getMonthlyProgress(url.searchParams.get("month"));

  return workbookResponse(`monthly-report-${report.selected}.xlsx`, [
    {
      name: "Summary",
      title: `${report.label} - Monthly Report`,
      subtitle: "Sales, payments, profit, vehicle activity, and monthly comparison",
      columns: ["Metric", "Value", "Vs Last Month"],
      rows: [
        ["Sales Revenue", money(report.totals.sales), `${report.comparisons.sales.toFixed(1)}%`],
        ["Gross Profit", money(report.totals.profit), `${report.comparisons.profit.toFixed(1)}%`],
        ["Payments Collected", money(report.totals.paymentsReceived), `${report.comparisons.paymentsReceived.toFixed(1)}%`],
        ["Outstanding Change", money(report.totals.outstandingChange), `${report.comparisons.outstandingChange.toFixed(1)}%`],
        ["Units Sold", report.totals.soldUnits, `${report.comparisons.soldUnits.toFixed(1)}%`],
        ["Units Loaded", report.totals.loadedUnits, `${report.comparisons.loadedUnits.toFixed(1)}%`],
        ["Units Returned", report.totals.returnedUnits, `${report.comparisons.returnedUnits.toFixed(1)}%`]
      ]
    },
    {
      name: "Vehicles",
      columns: ["Vehicle", "Loaded", "Sold", "Returned", "Sell-through %"],
      rows: report.vehicleRows.map((vehicle) => [vehicle.vehicle, vehicle.loaded, vehicle.sold, vehicle.returned, `${vehicle.sellThrough.toFixed(1)}%`])
    },
    {
      name: "Top Products",
      columns: ["Product", "Supplier", "Units Sold", "Revenue", "Profit"],
      rows: report.productRows.map((product) => [product.product, product.supplier, product.unitsSold, product.revenue, product.profit])
    },
    {
      name: "Top Shops",
      columns: ["Shop", "Invoice Total", "Payments Received"],
      rows: report.shopRows.map((shop) => [shop.shop, shop.invoiceTotal, shop.paymentsReceived])
    },
    {
      name: "Daily Trend",
      columns: ["Date", "Sales"],
      rows: report.dailyTrend.map((day) => [displayDate(day.date), day.sales])
    }
  ]);
}
