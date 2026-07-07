import Link from "next/link";
import { AlertTriangle, Banknote, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Receipt, RotateCcw, Truck } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { ReportDateFilter } from "@/components/ReportDateFilter";
import { getDailyProgress } from "@/lib/dailyReport";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";

type Report = Awaited<ReturnType<typeof getDailyProgress>>;

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date);
}

function dateLabel(value: string) {
  return displayDate(value);
}

function invoiceNumber(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

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
  children,
  defaultOpen = true
}: {
  title: string;
  count?: number;
  meta?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="report-section" open={defaultOpen}>
      <summary className="report-section-header">
        <span className="report-section-title">{title}</span>
        {typeof count === "number" ? <span className="report-section-badge">{count}</span> : null}
        {meta ? <span className="report-section-meta">{meta}</span> : null}
        <ChevronDown className="report-section-toggle" size={16} aria-hidden />
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

function invoiceProductNames(invoice: Report["invoices"][number]) {
  const names = invoice.items.map((item) => item.product.name);
  const text = names.join(", ");
  return text.length > 40 ? `${text.slice(0, 40)}...` : text || "-";
}

function paymentAllocations(payment: Report["payments"][number]) {
  if (payment.allocations.length === 0) return "-";
  return payment.allocations
    .map((allocation) => `${invoiceNumber(allocation.invoice.id)}${Number(allocation.amount) < Number(allocation.invoice.totalAmount) ? " (partial)" : ""}`)
    .join(", ");
}

function methodLabel(method: string) {
  return method === "bank_transfer" ? "Bank Transfer" : method.charAt(0).toUpperCase() + method.slice(1);
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const report = await getDailyProgress(date);
  const today = toDateInputValue(startOfToday());
  const isToday = report.selected === today;
  const previousDate = addDays(report.selected, -1);
  const nextDate = addDays(report.selected, 1);

  return (
    <div className="report-page">
      <div className="report-date-bar report-day-bar">
        <Link href="/reports" className="report-tab-link active">Day Report</Link>
        <Link href="/reports/month" className="report-tab-link">Month Report</Link>
        <Link href={`/reports?date=${previousDate}`} className="report-date-arrow" aria-label="Previous day">
          <ChevronLeft size={18} />
        </Link>
        <div className="report-date-title">
          {isToday ? "Today" : "Selected day"} - {dateLabel(report.selected)}
        </div>
        <Link href={`/reports?date=${nextDate}`} className="report-date-arrow" aria-label="Next day">
          <ChevronRight size={18} />
        </Link>
        <div className="report-date-picker">
          <ReportDateFilter value={report.selected} />
        </div>
        <ExportButton href={`/api/exports/reports/daily?date=${report.selected}`} className="report-export-button">
          Export Excel
        </ExportButton>
      </div>

      <div className="report-summary-grid">
        <SummaryCard
          icon={<Receipt size={20} />}
          label="Today's sales"
          number={money(report.totals.invoiceValue)}
          subLabel={`${report.totals.invoices} invoice${report.totals.invoices === 1 ? "" : "s"}`}
        />
        <SummaryCard
          icon={<Banknote size={20} />}
          label="Collected today"
          number={money(report.totals.countedPaymentValue)}
          subLabel={`${report.totals.payments} payment${report.totals.payments === 1 ? "" : "s"}`}
        />
        <SummaryCard
          icon={<Truck size={20} />}
          label="Units loaded"
          number={report.totals.loaded}
          subLabel={`across ${report.totals.trips} trip${report.totals.trips === 1 ? "" : "s"}`}
        />
        <SummaryCard
          icon={<RotateCcw size={20} />}
          label="Units returned"
          number={report.totals.returned}
          subLabel="unsold stock"
        />
      </div>

      {report.alerts.length > 0 ? (
        <ReportSection title="Active alerts" count={report.alerts.length}>
          <div className="report-alert-list">
            {report.alerts.map((alert) => {
              const alertHref = "href" in alert ? alert.href : undefined;
              const content = (
                <>
                  <AlertTriangle size={16} />
                  <span>{alert.message}</span>
                  <span className="report-alert-meta">{alert.meta}</span>
                </>
              );

              return alertHref ? (
                <Link key={alert.id} href={alertHref} className={`report-alert report-alert-${alert.severity}`}>
                  {content}
                </Link>
              ) : (
                <div key={alert.id} className={`report-alert report-alert-${alert.severity}`}>
                  {content}
                </div>
              );
            })}
          </div>
        </ReportSection>
      ) : null}

      <ReportSection title="Trips today" count={report.trips.length}>
        {report.trips.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Supplier</th>
                <th className="right">Loaded</th>
                <th className="right">Returned</th>
                <th className="right">Expected Sold</th>
                <th>Status</th>
                <th>Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {report.trips.map((trip) => (
                <tr key={trip.id}>
                  <td><Link href={`/trips/${trip.id}`} className="report-cell-link strong">{trip.vehicle}</Link></td>
                  <td>{trip.supplier}</td>
                  <td className="right">{trip.loaded}</td>
                  <td className="right">{trip.returned}</td>
                  <td className="right">{trip.expectedSold}</td>
                  <td><StatusBadge tone={trip.status === "closed" ? "success" : "warning"}>{trip.status === "closed" ? "Closed" : "Open"}</StatusBadge></td>
                  <td>
                    {trip.mismatchCount === 0 ? (
                      <StatusBadge tone="success">Matched</StatusBadge>
                    ) : (
                      <StatusBadge tone="danger">{trip.mismatchCount} items</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No trips today. Start a trip when a vehicle loads up.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Stock received" count={report.stockReceived.length}>
        {report.stockReceived.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Measurement</th>
                <th>Supplier</th>
                <th className="right">Qty</th>
                <th>Expiry Date</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {report.stockReceived.map((batch) => {
                const daysToExpiry = Math.ceil((batch.expiryDate.getTime() - new Date(`${report.selected}T00:00:00.000Z`).getTime()) / 86400000);
                const nearExpiry = daysToExpiry <= 60;
                return (
                  <tr key={batch.id}>
                    <td className="strong">{batch.product.name}</td>
                    <td>{batch.product.measurement}</td>
                    <td>{batch.product.supplier.name}</td>
                    <td className="right strong">{batch.quantity}</td>
                    <td className={nearExpiry ? "danger-text" : ""}>{displayDate(batch.expiryDate)}</td>
                    <td>{nearExpiry ? <StatusBadge tone="danger">Near expiry</StatusBadge> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState>No stock received today.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Invoices" count={report.invoices.length} meta={money(report.totals.invoiceValue)}>
        {report.invoices.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Shop</th>
                <th>Products</th>
                <th className="right">Total</th>
                <th>Paid Status</th>
              </tr>
            </thead>
            <tbody>
              {report.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><Link href={`/invoices/${invoice.id}`} className="report-cell-link mono">{invoiceNumber(invoice.id)}</Link></td>
                  <td className="strong">{invoice.shop.name}</td>
                  <td className="muted">{invoiceProductNames(invoice)}</td>
                  <td className="right strong">{money(invoice.totalAmount)}</td>
                  <td>
                    <StatusBadge tone={invoice.paidStatus === "paid" ? "success" : invoice.paidStatus === "partial" ? "warning" : "danger"}>
                      {invoice.paidStatus.charAt(0).toUpperCase() + invoice.paidStatus.slice(1)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No invoices today.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Payments received" count={report.payments.length} meta={money(report.totals.countedPaymentValue)}>
        {report.payments.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th className="right">Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Invoices Settled</th>
              </tr>
            </thead>
            <tbody>
              {report.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="strong">{payment.shop.name}</td>
                  <td className="right strong">{money(payment.amount)}</td>
                  <td><StatusBadge tone={payment.method === "cheque" ? "warning" : "accent"}>{methodLabel(payment.method)}</StatusBadge></td>
                  <td>
                    {payment.method === "cheque" ? (
                      <StatusBadge tone={payment.chequeStatus === "cleared" ? "success" : "warning"}>
                        {payment.chequeStatus === "cleared" ? "Cleared" : "Pending"}
                      </StatusBadge>
                    ) : null}
                  </td>
                  <td className="muted small">{paymentAllocations(payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>No payments recorded today.</EmptyState>
        )}
      </ReportSection>

      <ReportSection title="Day summary">
        <div className="report-balance-grid">
          <div className="report-balance-card">
            <div className="report-summary-label">Total billed</div>
            <div className="report-summary-number">{money(report.totals.invoiceValue)}</div>
            <div className="report-summary-sub">today</div>
          </div>
          <div className="report-balance-card">
            <div className="report-summary-label">Total collected</div>
            <div className="report-summary-number">{money(report.totals.countedPaymentValue)}</div>
            <div className="report-summary-sub">today cleared</div>
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
