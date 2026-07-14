import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  Eye,
  FileText,
  Package,
  ReceiptText,
  RotateCcw,
  Truck
} from "lucide-react";
import { ChequeStatus, PaymentMethod, StockTransactionType } from "@prisma/client";
import { Badge, EmptyState, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { DatabaseUsageCard } from "@/components/DatabaseUsageCard";
import { ExpiryAlertList } from "@/components/ExpiryAlertList";
import { countedPaymentWhere, getOutstandingBalancesByShop } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { getDailyProgress } from "@/lib/dailyReport";
import { getDatabaseUsage } from "@/lib/databaseUsage";
import { displayDate, money, startOfToday } from "@/lib/dates";

function quantity(value: unknown) {
  return Number(value ?? 0);
}

function movementLabel(type: StockTransactionType) {
  if (type === StockTransactionType.load) return "Loaded";
  if (type === StockTransactionType.sale) return "Sold";
  if (type === StockTransactionType.return_to_warehouse) return "Returned";
  return "Adjusted";
}

function movementTone(type: StockTransactionType) {
  if (type === StockTransactionType.load) return "green" as const;
  if (type === StockTransactionType.sale) return "neutral" as const;
  if (type === StockTransactionType.return_to_warehouse) return "amber" as const;
  return "red" as const;
}

function SummaryCard({
  title,
  value,
  note,
  icon
}: {
  title: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted">{title}</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
          {note ? <div className="mt-1 text-xs text-muted">{note}</div> : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eeebe4] text-accent">
          {icon}
        </div>
      </div>
    </Panel>
  );
}

export default async function DashboardPage() {
  const today = startOfToday();

  const [
    shops,
    todayReport,
    invoiceTotal,
    countedPaymentsTotal,
    openInvoiceCount,
    oldInvoiceCount,
    pendingCheques,
    loadCount,
    returnCount,
    shopCount,
    productCount,
    batchCount,
    receivedStock,
    warehouseMovements,
    vehicleStock,
    recentMovements,
    databaseUsage
  ] = await Promise.all([
    prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getDailyProgress(),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: true }),
    prisma.payment.aggregate({ where: countedPaymentWhere, _sum: { amount: true } }),
    prisma.invoice.count({ where: { paidStatus: { not: "paid" } } }),
    prisma.invoice.count({ where: { invoiceType: "opening", paidStatus: { not: "paid" } } }),
    prisma.payment.findMany({
      where: { method: PaymentMethod.cheque, chequeStatus: ChequeStatus.pending },
      include: { shop: true },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
      take: 8
    }),
    prisma.vehicleLoad.count(),
    prisma.vehicleReturn.count(),
    prisma.shop.count(),
    prisma.product.count(),
    prisma.productBatch.count(),
    prisma.productBatch.aggregate({ _sum: { receivedQuantity: true } }),
    prisma.vehicleStockLedger.groupBy({
      by: ["transactionType"],
      where: {
        transactionType: {
          in: [StockTransactionType.load, StockTransactionType.return_to_warehouse]
        },
        transactionDate: { lte: today }
      },
      _sum: { quantityChange: true }
    }),
    prisma.vehicleStockLedger.aggregate({
      where: { transactionDate: { lte: today } },
      _sum: { quantityChange: true }
    }),
    prisma.vehicleStockLedger.findMany({
      include: {
        vehicle: true,
        product: { include: { supplier: true } },
        batch: true
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 8
    }),
    getDatabaseUsage()
  ]);

  const balanceMap = await getOutstandingBalancesByShop(shops.map((shop) => shop.id));
  const balances = shops.map((shop) => ({ shop, balance: balanceMap.get(shop.id) ?? 0 }));
  const highBalances = balances
    .filter((item) => item.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);
  const totalOutstanding = balances.reduce((sum, item) => sum + item.balance, 0);
  const pendingChequeTotal = pendingCheques.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const loadMovement = warehouseMovements.find((row) => row.transactionType === StockTransactionType.load);
  const returnMovement = warehouseMovements.find((row) => row.transactionType === StockTransactionType.return_to_warehouse);
  const warehouseStock =
    quantity(receivedStock._sum.receivedQuantity) -
    quantity(loadMovement?._sum.quantityChange) +
    Math.abs(quantity(returnMovement?._sum.quantityChange));
  const vehicleStockUnits = quantity(vehicleStock._sum.quantityChange);
  const countedPayments = Number(countedPaymentsTotal._sum.amount ?? 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Today is ${displayDate(today)}. Sales, payments, warehouse stock, and vehicle stock are ready for review.`}
        action={<LinkButton href="/reports/daily">Daily report</LinkButton>}
      />

      <Panel className="mb-5">
        <h2 className="mb-3 font-semibold">Workflow shortcuts</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <LinkButton href="/stock/receive">Receive stock</LinkButton>
          <LinkButton href="/operations/vehicle-stock" variant="secondary">Load / return vehicle</LinkButton>
          <LinkButton href="/invoices/new" variant="secondary">Create invoice</LinkButton>
          <LinkButton href="/payments" variant="secondary">Record payment</LinkButton>
          <LinkButton href="/reports/monthly" variant="secondary">Monthly report</LinkButton>
        </div>
      </Panel>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Today sales"
          value={money(todayReport.totals.sales)}
          note={`${todayReport.totals.invoiceCount} invoices, profit ${money(todayReport.totals.profit)}`}
          icon={<ReceiptText size={18} />}
        />
        <SummaryCard
          title="Today payments"
          value={money(todayReport.totals.paymentsReceived)}
          note={`Pending cheques today ${money(todayReport.totals.pendingChequeValue)}`}
          icon={<Banknote size={18} />}
        />
        <SummaryCard
          title="Today movement"
          value={`${todayReport.totals.loadedUnits} units`}
          note={`Sold ${todayReport.totals.soldUnits}, returned ${todayReport.totals.returnedUnits}`}
          icon={<Truck size={18} />}
        />
        <SummaryCard
          title="Current outstanding"
          value={money(totalOutstanding)}
          note={`${openInvoiceCount} open invoices, ${oldInvoiceCount} old bills`}
          icon={<FileText size={18} />}
        />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Warehouse stock"
          value={`${warehouseStock} units`}
          note={`${batchCount} batches, ${productCount} products`}
          icon={<Package size={18} />}
        />
        <SummaryCard
          title="Vehicle stock"
          value={`${vehicleStockUnits} units`}
          note={`${loadCount} loads, ${returnCount} returns recorded`}
          icon={<Truck size={18} />}
        />
        <SummaryCard
          title="Overall invoices"
          value={money(invoiceTotal._sum.totalAmount ?? 0)}
          note={`${invoiceTotal._count} invoices total`}
          icon={<ClipboardList size={18} />}
        />
        <SummaryCard
          title="Overall income"
          value={money(countedPayments)}
          note="Cash, bank, cleared cheques"
          icon={<Banknote size={18} />}
        />
        <DatabaseUsageCard usage={databaseUsage} />
      </div>

      {pendingCheques.length > 0 ? (
        <Panel className="mb-5 border-amber-300 bg-amber-50">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-700" />
              <h2 className="font-semibold">Pending cheques</h2>
              <Badge tone="amber">{money(pendingChequeTotal)}</Badge>
            </div>
            <LinkButton href="/payments" variant="secondary">Review payments</LinkButton>
          </div>
          <Table headers={["Date", "Shop", "Cheque", "Amount"]}>
            {pendingCheques.map((payment) => (
              <tr key={payment.id}>
                <td className="px-3 py-2 tabular">{displayDate(payment.paymentDate)}</td>
                <td className="px-3 py-2 font-medium">{payment.shop.name}</td>
                <td className="px-3 py-2">{payment.chequeNumber ?? "-"}</td>
                <td className="px-3 py-2 tabular">{money(payment.amount)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Today by vehicle</h2>
            <LinkButton href="/operations/vehicle-stock" variant="secondary">Vehicle stock</LinkButton>
          </div>
          {todayReport.vehicleRows.length > 0 ? (
            <Table headers={["Vehicle", "Loaded", "Sold", "Returned", "Current"]}>
              {todayReport.vehicleRows.map((row) => (
                <tr key={row.vehicleId}>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/operations/vehicle-stock?vehicleId=${row.vehicleId}`} className="hover:text-accent">
                      {row.vehicle}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular">{row.loaded}</td>
                  <td className="px-3 py-2 tabular">{row.sold}</td>
                  <td className="px-3 py-2 tabular">{row.returned}</td>
                  <td className="px-3 py-2 tabular">{row.currentBalance}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState>No vehicle activity recorded today.</EmptyState>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Shops with balances</h2>
            <LinkButton href="/shops" variant="secondary">All shops</LinkButton>
          </div>
          {highBalances.length > 0 ? (
            <Table headers={["Shop", "Outstanding", "Action"]}>
              {highBalances.map(({ shop, balance }) => (
                <tr key={shop.id}>
                  <td className="px-3 py-2 font-medium">{shop.name}</td>
                  <td className="px-3 py-2 text-red-700 tabular">{money(balance)}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/shops/${shop.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                      title="View shop"
                      aria-label="View shop"
                    >
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState>No shop balances to review.</EmptyState>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="mb-3 font-semibold">Recent stock movement</h2>
          {recentMovements.length > 0 ? (
            <Table headers={["Date", "Vehicle", "Product", "Qty", "Type"]}>
              {recentMovements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-3 py-2 tabular">{displayDate(movement.transactionDate)}</td>
                  <td className="px-3 py-2">{movement.vehicle.nameOrNumber}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{movement.product.name} {movement.product.measurement}</div>
                    <div className="text-xs text-muted">
                      {movement.product.supplier.name} - exp {displayDate(movement.batch.expiryDate)}
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular">{Math.abs(movement.quantityChange)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={movementTone(movement.transactionType)}>{movementLabel(movement.transactionType)}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState>No stock movement recorded yet.</EmptyState>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <RotateCcw size={17} className="text-accent" />
            <h2 className="font-semibold">Expiry alerts</h2>
          </div>
          <ExpiryAlertList />
        </Panel>
      </div>
    </>
  );
}
