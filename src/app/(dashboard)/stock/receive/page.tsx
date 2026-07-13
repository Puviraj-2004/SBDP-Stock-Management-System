import { BatchReceiveForm } from "@/components/BatchReceiveForm";
import { PageHeader, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { startOfToday, toDateInputValue } from "@/lib/dates";

export default async function ReceiveStockPage({
  searchParams
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const [{ productId }, products] = await Promise.all([
    searchParams,
    prisma.product.findMany({
      include: { supplier: true },
      orderBy: [{ name: "asc" }, { measurement: "asc" }]
    })
  ]);

  return (
    <>
      <PageHeader title="Receive stock" description="Add a new product batch with quantity and expiry date." />
      <Panel className="max-w-3xl">
        <BatchReceiveForm
          today={toDateInputValue(startOfToday())}
          defaultProductId={productId}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            measurement: product.measurement,
            supplierName: product.supplier.name,
            barcode: product.barcode,
            itemCode: product.itemCode
          }))}
        />
      </Panel>
    </>
  );
}
