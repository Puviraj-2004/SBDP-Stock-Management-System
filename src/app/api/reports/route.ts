import { NextResponse } from "next/server";
import { getShopOutstandingBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";

export async function GET() {
  const [shops, invoices, expiryAlerts] = await Promise.all([
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany(),
    prisma.productBatch.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: { include: { supplier: true } } },
      orderBy: { expiryDate: "asc" },
      take: 50
    })
  ]);
  const balances = await Promise.all(shops.map(async (shop) => ({ shopId: shop.id, shopName: shop.name, balance: await getShopOutstandingBalance(shop.id) })));
  return NextResponse.json({
    revenue: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
    balances,
    expiryAlerts
  });
}
