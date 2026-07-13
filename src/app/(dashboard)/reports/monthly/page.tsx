import Link from "next/link";
import { Banknote, PackageCheck, RotateCcw, TrendingUp, Truck } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { MonthFilter } from "@/components/MonthFilter";
import { getMonthlyProgress } from "@/lib/monthlyReport";
import { displayDate, money } from "@/lib/dates";

function comparisonTone(value: number, favorableWhenDown = false) {
  if (value === 0) return "neutral";
  const favorable = favorableWhenDown ? value < 0 : value > 0;
  return favorable ? "success" : "danger";
}

function Comparison({ value, favorableWhenDown = false }: { value: number; favorableWhenDown?: boolean }) {
  const direction = value === 0 ? "-" : value > 0 ? "Up" : "Down";
  const tone = comparisonTone(value, favorableWhenDown);
  return <span className={`report-badge report-badge-${tone}`}>{direction} {Math.abs(value).toFixed(1)}% vs last month</span>;
}

function SummaryCard({
  icon,
  label,
  value,
  comparison,
  favorableWhenDown = false
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  comparison: number;
  favorableWhenDown?: boolean;
}) {
  return (
    <div className="report-summary-card">
      <div className="report-summary-icon">{icon}</div>
      <div className="report-summary-label">{label}</div>
      <div className="report-summary-number">{value}</div>
      <div className="report-summary-sub"><Comparison value={comparison} favorableWhenDown={favorableWhenDown} /></div>
    </div>
  );
}

function maxTrendValue(rows: { sales: number }[]) {
  return Math.max(1, ...rows.map((row) => row.sales));
}

export default async function MonthlyReportPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const report = await getMonthlyProgress(month);
  const maxSales = maxTrendValue(report.dailyTrend);

  return (
    <div className="report-page">
      <div className="report-date-bar report-month-bar">
        <div className="report-date-title">Monthly report - {report.label}</div>
        <div className="report-date-picker">
          <MonthFilter value={report.selected} />
        </div>
        <ExportButton href={`/api/exports/reports/month?month=${report.selected}`} className="report-export-button">Export Excel</ExportButton>
      </div>

      <div className="report-summary-grid">
        <SummaryCard icon={<TrendingUp size={20} />} label="Sales revenue" value={money(report.totals.sales)} comparison={report.comparisons.sales} />
        <SummaryCard icon={<TrendingUp size={20} />} label="Gross profit" value={money(report.totals.profit)} comparison={report.comparisons.profit} />
        <SummaryCard icon={<Banknote size={20} />} label="Payments collected" value={money(report.totals.paymentsReceived)} comparison={report.comparisons.paymentsReceived} />
        <SummaryCard icon={<Banknote size={20} />} label="Outstanding change" value={money(report.totals.outstandingChange)} comparison={report.comparisons.outstandingChange} favorableWhenDown />
        <SummaryCard icon={<PackageCheck size={20} />} label="Units sold" value={report.totals.soldUnits} comparison={report.comparisons.soldUnits} />
        <SummaryCard icon={<Truck size={20} />} label="Units loaded" value={report.totals.loadedUnits} comparison={report.comparisons.loadedUnits} />
        <SummaryCard icon={<RotateCcw size={20} />} label="Units returned" value={report.totals.returnedUnits} comparison={report.comparisons.returnedUnits} favorableWhenDown />
      </div>

      <section className="report-section">
        <div className="report-section-header"><span className="report-section-title">Per-vehicle monthly summary</span></div>
        <div className="report-section-body">
          <table className="report-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th className="right">Loaded</th>
                <th className="right">Sold</th>
                <th className="right">Returned</th>
                <th className="right">Sell-through %</th>
              </tr>
            </thead>
            <tbody>
              {report.vehicleRows.map((vehicle) => (
                <tr key={vehicle.vehicleId}>
                  <td className="strong">{vehicle.vehicle}</td>
                  <td className="right">{vehicle.loaded}</td>
                  <td className="right">{vehicle.sold}</td>
                  <td className={`right ${vehicle.returned > 0 ? "danger-text" : ""}`}>{vehicle.returned}</td>
                  <td className="right strong">{vehicle.sellThrough.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-header"><span className="report-section-title">Top products this month</span></div>
        <div className="report-section-body">
          <table className="report-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th className="right">Units sold</th>
                <th className="right">Revenue</th>
                <th className="right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {report.productRows.slice(0, 10).map((product) => (
                <tr key={product.productId}>
                  <td><Link href={`/products/${product.productId}`} className="report-cell-link strong">{product.product}</Link></td>
                  <td>{product.supplier}</td>
                  <td className="right">{product.unitsSold}</td>
                  <td className="right strong">{money(product.revenue)}</td>
                  <td className="right">{money(product.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-header"><span className="report-section-title">Top shops this month</span></div>
        <div className="report-section-body">
          <table className="report-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th className="right">Invoice total</th>
                <th className="right">Payments received</th>
              </tr>
            </thead>
            <tbody>
              {report.shopRows.slice(0, 10).map((shop) => (
                <tr key={shop.shopId}>
                  <td><Link href={`/shops/${shop.shopId}`} className="report-cell-link strong">{shop.shop}</Link></td>
                  <td className="right strong">{money(shop.invoiceTotal)}</td>
                  <td className="right">{money(shop.paymentsReceived)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-header"><span className="report-section-title">Daily sales trend</span></div>
        <div className="report-section-body">
          <div className="grid gap-2">
            {report.dailyTrend.map((day) => (
              <Link key={day.date} href={`/reports/daily?date=${day.date}`} className="grid grid-cols-[90px_1fr_120px] items-center gap-3 text-sm">
                <span className="tabular">{displayDate(day.date).slice(0, 5)}</span>
                <span className="h-3 rounded bg-[#e7e2d8]">
                  <span className="block h-3 rounded bg-accent" style={{ width: `${Math.max(2, (day.sales / maxSales) * 100)}%` }} />
                </span>
                <span className="right tabular">{money(day.sales)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
