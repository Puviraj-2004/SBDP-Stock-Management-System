import { notFound } from "next/navigation";
import { InvoiceBuilderForm } from "@/components/InvoiceBuilderForm";
import { PageHeader, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, money, toDateInputValue } from "@/lib/dates";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, shops, products, trips] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { shop: true, items: true, payments: true, allocations: true }
    }),
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" } }),
    prisma.loadingTrip.findMany({
      include: {
        vehicle: true,
        items: { include: { batch: { select: { productId: true } } } }
      },
      orderBy: { tripDate: "desc" },
      take: 100
    })
  ]);
  if (!invoice) notFound();

  return (
    <>
      <PageHeader title="Edit invoice" description={`${invoice.shop.name} - ${money(invoice.totalAmount)}`} />
      <Panel>
        {invoice.payments.length > 0 || invoice.allocations.length > 0 ? (
          <p className="text-sm text-muted">This invoice has payments, so edit is locked. Delete or adjust the payment first if this was a data entry mistake.</p>
        ) : (
          <InvoiceBuilderForm
            mode="edit"
            invoiceId={invoice.id}
            defaultShopId={invoice.shopId}
            defaultTripId={invoice.tripId ?? ""}
            defaultInvoiceDate={toDateInputValue(invoice.invoiceDate)}
            initialItems={invoice.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity
            }))}
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
        )}
      </Panel>
    </>
  );
}
