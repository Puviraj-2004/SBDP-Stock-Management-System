import { ShopsTable } from "@/components/ShopsTable";
import { LinkButton, PageHeader } from "@/components/ui";
import { getShopOutstandingBalance } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";

export default async function ShopsPage() {
  const shops = await prisma.shop.findMany({
    include: { _count: { select: { invoices: true, payments: true } } },
    orderBy: { name: "asc" }
  });
  const rows = await Promise.all(
    shops.map(async (shop) => {
      const balance = await getShopOutstandingBalance(shop.id);
      return {
        id: shop.id,
        name: shop.name,
        contactNumber: shop.contactNumber,
        address: shop.address,
        invoiceCount: shop._count.invoices,
        paymentCount: shop._count.payments,
        balance,
        balanceLabel: money(balance)
      };
    })
  );

  return (
    <>
      <PageHeader title="Shops" description="Shops are selected from this permanent list when billing." action={<LinkButton href="/shops/new">Add shop</LinkButton>} />
      <ShopsTable rows={rows} />
    </>
  );
}
