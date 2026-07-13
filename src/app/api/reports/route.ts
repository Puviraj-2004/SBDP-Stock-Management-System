import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { getShopOutstandingBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const [shops, invoices, expiryAlerts] = await Promise.all([
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany(),
    prisma.productBatch.findMany({
      include: { product: { include: { supplier: true } } },
      orderBy: { expiryDate: "asc" },
      take: 50
    })
  ]);
  const warehouseBalances = await getWarehouseBalancesByBatchIds(expiryAlerts.map((batch) => batch.id));
  const balances = await Promise.all(shops.map(async (shop) => ({ shopId: shop.id, shopName: shop.name, balance: await getShopOutstandingBalance(shop.id) })));
  return NextResponse.json({
    revenue: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
    balances,
    expiryAlerts: expiryAlerts
      .map((batch) => ({ ...batch, warehouseBalance: warehouseBalances.get(batch.id) ?? 0 }))
      .filter((batch) => batch.warehouseBalance > 0)
  });
}
