import { InvoiceBuilderForm } from "@/components/InvoiceBuilderForm";
import { PageHeader, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";

export default async function NewInvoicePage() {
  const [shops, products, trips] = await Promise.all([
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" } }),
    prisma.loadingTrip.findMany({
      where: { status: "closed" },
      include: {
        vehicle: true,
        items: { include: { batch: { select: { productId: true } } } }
      },
      orderBy: { tripDate: "desc" },
      take: 100
    })
  ]);

  return (
    <>
      <PageHeader title="Create invoice" description="Build the invoice by scanning or selecting products." />
      <Panel>
        <InvoiceBuilderForm
          mode="create"
          defaultInvoiceDate={toDateInputValue(startOfToday())}
          shops={shops.map((shop) => ({ id: shop.id, name: shop.name }))}
          trips={trips.map((trip) => ({
            id: trip.id,
            label: `${displayDate(trip.tripDate)} - ${trip.vehicle.nameOrNumber}`,
            tripDate: toDateInputValue(trip.tripDate),
            productIds: [...new Set(trip.items.map((item) => item.batch.productId))]
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            measurement: product.measurement,
            supplierName: product.supplier.name,
            barcode: product.barcode,
            itemCode: product.itemCode,
            sellingPrice: Number(product.sellingPrice),
            priceLabel: money(product.sellingPrice)
          }))}
        />
      </Panel>
    </>
  );
}
