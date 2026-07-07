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
      subtitle: "Sales, collections, trips, stock, and outstanding summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Month", report.label],
        ["Sales", money(report.totals.invoiceValue)],
        ["Collections", money(report.totals.collectionValue)],
        ["Invoices", report.totals.invoiceCount],
        ["Payments", report.totals.paymentCount],
        ["Trips", report.totals.tripCount],
        ["Shops Billed", report.totals.shopCount],
        ["Stock Received Units", report.totals.stockReceivedUnits],
        ["Pending Cheques", money(report.totals.pendingChequeValue)],
        ["Net Outstanding", money(report.totals.totalOutstanding)]
      ]
    },
    {
      name: "Vehicle Performance",
      title: `${report.label} - Vehicle Performance`,
      subtitle: "Vehicles ranked by invoice sales from linked trips",
      columns: ["Rank", "Vehicle", "Trips", "Invoices", "Sales", "Collections", "Loaded", "Returned", "Expected Sold", "Behind Top", "Sales %"],
      rows: report.vehicleRows.map((vehicle) => [
        vehicle.rank,
        vehicle.vehicle,
        vehicle.trips,
        vehicle.invoices,
        vehicle.sales,
        vehicle.collections,
        vehicle.loaded,
        vehicle.returned,
        vehicle.expectedSold,
        vehicle.rank === 1 ? 0 : vehicle.differenceFromTop,
        `${vehicle.salesPercent.toFixed(1)}%`
      ])
    },
    {
      name: "Top Products",
      title: `${report.label} - Product Sales`,
      subtitle: "Products sorted by monthly sales value",
      columns: ["Product", "Supplier", "Qty Sold", "Sales"],
      rows: report.productRows.map((row) => [row.product, row.supplier, row.quantity, row.value])
    },
    {
      name: "Shop Sales",
      title: `${report.label} - Shop Sales`,
      subtitle: "Shops sorted by monthly invoice value",
      columns: ["Shop", "Invoices", "Sales", "Paid", "Remaining"],
      rows: report.shopRows.map((shop) => [shop.shop, shop.invoices, shop.value, shop.paid, shop.remaining])
    },
    {
      name: "Trips",
      title: `${report.label} - Trips`,
      subtitle: "All trips created in the selected month",
      columns: ["Date", "Vehicle", "Supplier", "Loaded", "Returned", "Expected Sold", "Invoice Value", "Status"],
      rows: report.trips.map((trip) => [
        trip.date,
        trip.vehicle,
        trip.supplier,
        trip.loaded,
        trip.returned,
        trip.expectedSold,
        trip.invoiceValue,
        trip.status
      ])
    },
    {
      name: "Stock Received",
      title: `${report.label} - Stock Received`,
      subtitle: "Batches received in the selected month",
      columns: ["Received Date", "Product", "Supplier", "Qty", "Expiry"],
      rows: report.stockReceived.map((batch) => [
        displayDate(batch.receivedDate),
        `${batch.product.name} ${batch.product.measurement}`,
        batch.product.supplier.name,
        batch.quantity,
        displayDate(batch.expiryDate)
      ])
    }
  ]);
}
