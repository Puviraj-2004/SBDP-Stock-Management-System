import Link from "next/link";
import { Banknote, Eye, PackageCheck, Receipt, RotateCcw, TrendingUp, Truck } from "lucide-react";
import { ReportDateFilter } from "@/components/ReportDateFilter";
import { ReportSupplierFilter } from "@/components/ReportSupplierFilter";
import { getDailyProgress } from "@/lib/dailyReport";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";

function SummaryCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="report-summary-card">
      <div className="report-summary-icon">{icon}</div>
      <div className="report-summary-label">{label}</div>
      <div className="report-summary-number">{value}</div>
      <div className="report-summary-sub">{note}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "paid" | "partial" | "unpaid" }) {
  const tone = status === "paid" ? "success" : status === "partial" ? "warning" : "danger";
  return <span className={`report-badge report-badge-${tone}`}>{status}</span>;
}

function methodLabel(method: string) {
  return method === "bank_transfer" ? "Bank" : method.charAt(0).toUpperCase() + method.slice(1);
}

export default async function DailyReportPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string; supplierId?: string }>;
}) {
  const { date, supplierId } = await searchParams;
  const [report, suppliers] = await Promise.all([
    getDailyProgress(date, supplierId),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  const today = toDateInputValue(startOfToday());

  return (
    <div className="report-page">
      <div className="report-date-bar report-day-bar">
        <div className="report-date-title">
          Daily report - {report.selected === today ? "Today" : displayDate(report.selected)}
          {report.supplier ? ` - ${report.supplier.name}` : ""}
        </div>
        <div className="report-date-picker">
          <ReportDateFilter value={report.selected} supplierId={report.supplier?.id} />
        </div>
        <div className="report-date-picker">
          <ReportSupplierFilter
            mode="daily"
            date={report.selected}
            suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
            selectedSupplierId={report.supplier?.id}
          />
        </div>
      </div>

      {!report.hasActivity ? (
        <div className="report-empty">No activity recorded for this date.</div>
      ) : (
        <>
          <div className="report-summary-grid">
            <SummaryCard icon={<Receipt size={20} />} label="Sales revenue" value={money(report.totals.sales)} note={`${report.totals.invoiceCount} sale invoices`} />
            <SummaryCard icon={<TrendingUp size={20} />} label="Gross profit" value={money(report.totals.profit)} note="selling price - batch cost" />
            {!report.isSupplierFiltered ? (
              <SummaryCard icon={<Receipt size={20} />} label="Old balance added" value={money(report.totals.openingBalanceAdded)} note={`${report.totals.oldInvoiceCount} old invoices`} />
            ) : null}
            <SummaryCard icon={<Banknote size={20} />} label="Payments received" value={money(report.totals.paymentsReceived)} note={report.isSupplierFiltered ? "overall payments" : "cash, bank, cleared cheques"} />
            <SummaryCard icon={<Truck size={20} />} label="Units loaded" value={report.totals.loadedUnits} note={`across ${report.totals.loadedVehicles} vehicles`} />
            <SummaryCard icon={<PackageCheck size={20} />} label="Units sold" value={report.totals.soldUnits} note="from invoices today" />
            <SummaryCard icon={<RotateCcw size={20} />} label="Units returned" value={report.totals.returnedUnits} note="back to warehouse" />
            <SummaryCard icon={<Banknote size={20} />} label="New pending cheques" value={money(report.totals.pendingChequeValue)} note="not realized yet" />
          </div>

          {report.isSupplierFiltered ? (
            <section className="report-section">
              <div className="report-section-header">
                <span className="report-section-title">Supplier product details</span>
              </div>
              <div className="report-section-body">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="right">Loaded</th>
                      <th className="right">Sold</th>
                      <th className="right">Returned</th>
                      <th className="right">Revenue</th>
                      <th className="right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.productRows.map((product) => (
                      <tr key={product.productId}>
                        <td><Link href={`/products/${product.productId}`} className="report-cell-link strong">{product.product}</Link></td>
                        <td className="right">{product.loaded}</td>
                        <td className="right">{product.sold}</td>
                        <td className={`right ${product.returned > 0 ? "danger-text" : ""}`}>{product.returned}</td>
                        <td className="right strong">{money(product.revenue)}</td>
                        <td className="right">{money(product.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="report-section">
            <div className="report-section-header">
              <span className="report-section-title">Per-vehicle activity</span>
            </div>
            <div className="report-section-body">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th className="right">Loaded today</th>
                    <th className="right">Sold today</th>
                    <th className="right">Returned today</th>
                    <th className="right">Current balance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.vehicleRows.map((row) => (
                    <tr key={row.vehicleId}>
                      <td className="strong">{row.vehicle}</td>
                      <td className="right">{row.loaded}</td>
                      <td className="right">{row.sold}</td>
                      <td className={`right ${row.returned > 0 ? "danger-text" : ""}`}>{row.returned}</td>
                      <td className="right strong">{row.currentBalance}</td>
                      <td>
                        <Link href={`/operations/vehicle-stock?vehicleId=${row.vehicleId}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View vehicle stock" aria-label="View vehicle stock">
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-header">
              <span className="report-section-title">Invoices created today</span>
              {report.invoices.length > 5 ? <Link href="/invoices" className="report-section-meta">View all</Link> : null}
            </div>
            <div className="report-section-body">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Source</th>
                    <th>Vehicle</th>
                    <th className="right">Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.invoices.slice(0, 6).map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="strong">{invoice.shop}</td>
                      <td>{invoice.invoiceType === "opening" ? "Old invoice" : "Sale invoice"}</td>
                      <td>{invoice.vehicle}</td>
                      <td className="right strong">{money(invoice.amount)}</td>
                      <td><StatusBadge status={invoice.status} /></td>
                      <td><Link href={`/invoices/${invoice.id}`} className="report-cell-link">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-header">
              <span className="report-section-title">Payments received today</span>
              {report.payments.length > 5 ? <Link href="/payments" className="report-section-meta">View all</Link> : null}
            </div>
            <div className="report-section-body">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th className="right">Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.payments.slice(0, 6).map((payment) => (
                    <tr key={payment.id}>
                      <td className="strong">{payment.shop}</td>
                      <td className="right strong">{money(payment.amount)}</td>
                      <td>{methodLabel(payment.method)}</td>
                      <td>{payment.method === "cheque" ? <span className={`report-badge report-badge-${payment.chequeStatus === "cleared" ? "success" : "warning"}`}>{payment.chequeStatus}</span> : null}</td>
                      <td><Link href={`/shops/${payment.shopId}`} className="report-cell-link">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
