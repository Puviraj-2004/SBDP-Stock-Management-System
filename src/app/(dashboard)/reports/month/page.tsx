import Link from "next/link";
import { Banknote, Boxes, FileText, Truck } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { MonthFilter } from "@/components/MonthFilter";
import { getMonthlyProgress } from "@/lib/monthlyReport";
import { displayDate, money } from "@/lib/dates";

function StatusBadge({
  tone,
  children
}: {
  tone: "success" | "warning" | "danger" | "neutral" | "accent";
  children: React.ReactNode;
}) {
  return <span className={`report-badge report-badge-${tone}`}>{children}</span>;
}

function ReportSection({
  title,
  count,
  meta,
  children
}: {
  title: string;
  count?: number;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="report-section" open>
      <summary className="report-section-header">
        <span className="report-section-title">{title}</span>
        {typeof count === "number" ? <span className="report-section-badge">{count}</span> : null}
        {meta ? <span className="report-section-meta">{meta}</span> : null}
      </summary>
      <div className="report-section-body">{children}</div>
    </details>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="report-empty">{children}</div>;
}

function SummaryCard({
  icon,
  label,
  number,
  subLabel
}: {
  icon: React.ReactNode;
  label: string;
  number: React.ReactNode;
  subLabel: string;
}) {
  return (
    <div className="report-summary-card">
      <div className="report-summary-icon">{icon}</div>
      <div className="report-summary-label">{label}</div>
      <div className="report-summary-number">{number}</div>
      <div className="report-summary-sub">{subLabel}</div>
    </div>
  );
}

export default async function MonthlyReportsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const report = await getMonthlyProgress(month);

  return (
    <div className="report-page">
      <div className="report-date-bar report-month-bar">
        <Link href="/reports" className="report-tab-link">Day Report</Link>
        <Link href="/reports/month" className="report-tab-link active">Month Report</Link>
        <div className="report-date-title">{report.label}</div>
        <div className="report-date-picker">
          <MonthFilter value={report.selected} />
        </div>
        <ExportButton href={`/api/exports/reports/month?month=${report.selected}`} className="report-export-button">
          Export Excel
        </ExportButton>
      </div>

      <div className="report-summary-grid">
        <SummaryCard
          icon={<FileText size={20} />}
          label="Monthly sales"
          number={money(report.totals.invoiceValue)}
          subLabel={`${report.totals.invoiceCount} invoices`}
        />
        <SummaryCard
          icon={<Banknote size={20} />}
          label="Monthly collections"
          number={money(report.totals.collectionValue)}
          subLabel={`${report.totals.paymentCount} payments`}
        />
        <SummaryCard
          icon={<Truck size={20} />}
          label="Trips"
          number={report.totals.tripCount}
          subLabel={`${report.vehicleRows.length} vehicles used`}
        />
        <SummaryCard
          icon={<Boxes size={20} />}
          label="Stock received"
          number={report.totals.stockReceivedUnits}
          subLabel="units received"
        />
      </div>

      <ReportSection title="Vehicle performance" count={report.vehicleRows.length} meta="Sorted by sales">
        {report.vehicleRows.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Vehicle</th>
                <th className="right">Trips</th>
                <th className="right">Sales</th>
                <th className="right">Collections</th>
                <th className="right">Loaded</th>
                <th className="right">Returned</th>
                <th className="right">Expected Sold</th>
                <th className="right">Behind Top</th>
                <th className="right">Sales %</th>
              </tr>
            </thead>
            <tbody>
              {report.vehicleRows.map((vehicle) => (
                <tr key={vehicle.vehicle}>
                  <td className="tabular">{vehicle.rank}</td>
                  <td className="strong">{vehicle.vehicle}</td>
                  <td className="right">{vehicle.trips}</td>
                  <td className="right strong">{money(vehicle.sales)}</td>
                  <td className="right">{money(vehicle.collections)}</td>
                  <td className="right">{vehicle.loaded}</td>
                  <td className="right">{vehicle.returned}</td>
                  <td className="right">{vehicle.expectedSold}</td>
                  <td className="right">{vehicle.rank === 1 ? "-" : money(vehicle.differenceFromTop)}</td>
                  <td className="right">{vehicle.salesPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No vehicle sales for this month.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Top products" count={report.productRows.length} meta={money(report.productRows.reduce((sum, row) => sum + row.value, 0))}>
        {report.productRows.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th className="right">Qty Sold</th>
                <th className="right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {report.productRows.slice(0, 20).map((row) => (
                <tr key={`${row.product}-${row.supplier}`}>
                  <td className="strong">{row.product}</td>
                  <td>{row.supplier}</td>
                  <td className="right">{row.quantity}</td>
                  <td className="right strong">{money(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No product sales for this month.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Shop sales" count={report.shopRows.length} meta={money(report.totals.invoiceValue)}>
        {report.shopRows.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th className="right">Invoices</th>
                <th className="right">Sales</th>
                <th className="right">Paid</th>
                <th className="right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {report.shopRows.slice(0, 30).map((shop) => (
                <tr key={shop.shop}>
                  <td className="strong">{shop.shop}</td>
                  <td className="right">{shop.invoices}</td>
                  <td className="right strong">{money(shop.value)}</td>
                  <td className="right">{money(shop.paid)}</td>
                  <td className="right">{money(shop.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No shop sales for this month.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Trips this month" count={report.trips.length}>
        {report.trips.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Supplier</th>
                <th className="right">Loaded</th>
                <th className="right">Returned</th>
                <th className="right">Expected Sold</th>
                <th className="right">Invoice Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="tabular">{trip.date}</td>
                  <td className="strong">{trip.vehicle}</td>
                  <td>{trip.supplier}</td>
                  <td className="right">{trip.loaded}</td>
                  <td className="right">{trip.returned}</td>
                  <td className="right">{trip.expectedSold}</td>
                  <td className="right">{money(trip.invoiceValue)}</td>
                  <td><StatusBadge tone={trip.status === "closed" ? "success" : "warning"}>{trip.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No trips for this month.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Stock received" count={report.stockReceived.length}>
        {report.stockReceived.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Supplier</th>
                <th className="right">Qty</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {report.stockReceived.map((batch) => (
                <tr key={batch.id}>
                  <td className="tabular">{displayDate(batch.receivedDate)}</td>
                  <td className="strong">{batch.product.name} {batch.product.measurement}</td>
                  <td>{batch.product.supplier.name}</td>
                  <td className="right">{batch.quantity}</td>
                  <td>{displayDate(batch.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No stock received this month.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Month balance summary">
        <div className="report-balance-grid">
          <div className="report-balance-card">
            <div className="report-summary-label">Total billed</div>
            <div className="report-summary-number">{money(report.totals.invoiceValue)}</div>
            <div className="report-summary-sub">selected month</div>
          </div>
          <div className="report-balance-card">
            <div className="report-summary-label">Total collected</div>
            <div className="report-summary-number">{money(report.totals.collectionValue)}</div>
            <div className="report-summary-sub">selected month</div>
          </div>
          <div className="report-balance-card">
            <div className="report-summary-label">Net outstanding</div>
            <div className={`report-summary-number ${report.totals.totalOutstanding > 0 ? "danger-text" : "success-text"}`}>
              {money(report.totals.totalOutstanding)}
            </div>
            <div className="report-summary-sub">all shops</div>
          </div>
        </div>
      </ReportSection>
    </div>
  );
}
