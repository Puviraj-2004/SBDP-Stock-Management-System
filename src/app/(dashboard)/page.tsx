import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { ExpiryAlertList } from "@/components/ExpiryAlertList";
import { DatabaseUsageCard } from "@/components/DatabaseUsageCard";
import { prisma } from "@/lib/db";
import { countedPaymentWhere, getOutstandingBalancesByShop } from "@/lib/balance";
import { getDailyProgress } from "@/lib/dailyReport";
import { getDatabaseUsage } from "@/lib/databaseUsage";
import { displayDate, money, startOfToday } from "@/lib/dates";

export default async function DashboardPage() {
  const [recentLoads, shops, todayReport, invoiceTotal, countedPaymentsTotal, loadCount, shopCount, databaseUsage] = await Promise.all([
    prisma.vehicleLoad.findMany({
      include: { vehicle: true, _count: { select: { items: true } } },
      orderBy: [{ loadDate: "desc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.shop.findMany({ orderBy: { name: "asc" }, take: 100 }),
    getDailyProgress(),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: true }),
    prisma.payment.aggregate({ where: countedPaymentWhere, _sum: { amount: true } }),
    prisma.vehicleLoad.count(),
    prisma.shop.count(),
    getDatabaseUsage()
  ]);

  const balanceMap = await getOutstandingBalancesByShop(shops.map((shop) => shop.id));
  const balances = shops.map((shop) => ({ shop, balance: balanceMap.get(shop.id) ?? 0 }));
  const highBalances = balances.filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8);
  const totalOutstanding = balances.reduce((sum, item) => sum + item.balance, 0);
  const countedPayments = Number(countedPaymentsTotal._sum.amount ?? 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Today is ${displayDate(startOfToday())}. Vehicle loads, expiring stock, and shop balances are ready for review.`}
        action={<LinkButton href="/operations/vehicle-stock">Vehicle stock</LinkButton>}
      />
      <Panel className="mb-5">
        <h2 className="mb-3 font-semibold">Workflow shortcuts</h2>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/stock/receive">Receive stock</LinkButton>
          <LinkButton href="/operations/vehicle-stock" variant="secondary">Vehicle stock</LinkButton>
          <LinkButton href="/invoices/new" variant="secondary">Create invoice</LinkButton>
          <LinkButton href="/shops" variant="secondary">Shop payments</LinkButton>
        </div>
      </Panel>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Panel>
          <h2 className="text-sm font-medium text-muted">Overall invoices</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{money(invoiceTotal._sum.totalAmount ?? 0)}</div>
          <div className="mt-1 text-xs text-muted">{invoiceTotal._count} invoices</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Overall income</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{money(countedPayments)}</div>
          <div className="mt-1 text-xs text-muted">Cash, bank, cleared cheques</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Loads</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{loadCount}</div>
          <div className="mt-1 text-xs text-muted">{recentLoads.length} recent loads</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Shops</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{shopCount}</div>
          <div className="mt-1 text-xs text-muted">Outstanding {money(totalOutstanding)}</div>
        </Panel>
        <DatabaseUsageCard usage={databaseUsage} />
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <h2 className="text-sm font-medium text-muted">Today loads</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{todayReport.totals.loadedVehicles}</div>
          <div className="mt-1 text-xs text-muted">vehicles loaded today</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Loaded stock</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{todayReport.totals.loadedUnits}</div>
          <div className="mt-1 text-xs text-muted">Returned {todayReport.totals.returnedUnits}, sold {todayReport.totals.soldUnits}</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Today invoices</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{todayReport.totals.invoiceCount}</div>
          <div className="mt-1 text-xs text-muted">{money(todayReport.totals.sales)}</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-medium text-muted">Today payments</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{money(todayReport.totals.paymentsReceived)}</div>
          <div className="mt-1 text-xs text-muted">Pending cheques {money(todayReport.totals.pendingChequeValue)}</div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent loads</h2>
            <LinkButton href="/operations/vehicle-stock" variant="secondary">Vehicle stock</LinkButton>
          </div>
          <Table headers={["Date", "Vehicle", "Items", "Status"]}>
            {recentLoads.map((load) => (
              <tr key={load.id}>
                <td className="px-3 py-2 tabular">{displayDate(load.loadDate)}</td>
                <td className="px-3 py-2">{load.vehicle.nameOrNumber}</td>
                <td className="px-3 py-2 tabular">{load._count.items}</td>
                <td className="px-3 py-2"><Badge tone="green">loaded</Badge></td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Shops with balances</h2>
          <Table headers={["Shop", "Outstanding", "Action"]}>
            {highBalances.map(({ shop, balance }) => (
              <tr key={shop.id}>
                <td className="px-3 py-2 font-medium">{shop.name}</td>
                <td className="px-3 py-2 text-red-700 tabular">{money(balance)}</td>
                <td className="px-3 py-2">
                  <Link href={`/shops/${shop.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]" title="View shop" aria-label="View shop">
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel className="mt-5">
        <h2 className="mb-3 font-semibold">Expiry alerts</h2>
        <ExpiryAlertList />
      </Panel>
    </>
  );
}
