import { ShopsTable } from "@/components/ShopsTable";
import { PaginationControls } from "@/components/PaginationControls";
import { LinkButton, PageHeader } from "@/components/ui";
import { getOutstandingBalancesByShop } from "@/lib/balance";
import { prisma } from "@/lib/db";
import { money } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";

export default async function ShopsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [shops, totalShops] = await Promise.all([
    prisma.shop.findMany({
      include: { _count: { select: { invoices: true, payments: true } } },
      orderBy: { name: "asc" },
      ...getPagination(page)
    }),
    prisma.shop.count()
  ]);
  const balanceMap = await getOutstandingBalancesByShop(shops.map((shop) => shop.id));
  const rows = shops.map((shop) => {
    const balance = balanceMap.get(shop.id) ?? 0;
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
  });

  return (
    <>
      <PageHeader title="Shops" description="Shops are selected from this permanent list when billing." action={<LinkButton href="/shops/new">Add shop</LinkButton>} />
      <ShopsTable rows={rows} />
      <div className="mt-4">
        <PaginationControls
          pathname="/shops"
          page={page}
          pageCount={getPageCount(totalShops)}
          total={totalShops}
          pageSize={DEFAULT_PAGE_SIZE}
        />
      </div>
    </>
  );
}
