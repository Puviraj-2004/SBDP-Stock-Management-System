import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { VehicleInvoiceForm } from "@/components/VehicleInvoiceForm";
import { LinkButton, PageHeader, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { getVehicleStockRows } from "@/lib/stockLedger";

type EditableInvoice = Prisma.InvoiceGetPayload<{
  include: {
    shop: true;
    vehicle: true;
    allocations: true;
    payments: true;
    items: { include: { batch: { include: { product: { include: { supplier: true } } } } } };
  };
}>;

export default async function EditInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoiceDate?: string }>;
}) {
  const { id } = await params;
  const { invoiceDate } = await searchParams;
  const [invoice, shops] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        shop: true,
        vehicle: true,
        allocations: true,
        payments: true,
        items: { include: { batch: { include: { product: { include: { supplier: true } } } } } }
      }
    }),
    prisma.shop.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!invoice) notFound();
  if (invoice.invoiceType === "opening") {
    return (
      <>
        <PageHeader title="Edit old invoice" description={`${invoice.shop.name} - ${money(invoice.totalAmount)}`} />
        <Panel>
          <p className="mb-3 text-sm text-muted">
            Old invoices are amount-only opening bills. Delete and re-enter the old invoice if this was a data entry mistake.
          </p>
          <LinkButton href={`/invoices/${invoice.id}`} variant="secondary">Back to invoice</LinkButton>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit invoice" description={`${invoice.shop.name} - ${money(invoice.totalAmount)}`} />
      <Panel>
        {invoice.payments.length > 0 || invoice.allocations.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-muted">
              This invoice has payments, so edit is locked. Delete or adjust the payment first if this was a data entry mistake.
            </p>
            <LinkButton href={`/invoices/${invoice.id}`} variant="secondary">Back to invoice</LinkButton>
          </>
        ) : !invoice.vehicle ? (
          <p className="text-sm text-muted">This invoice has no vehicle linked, so it cannot be edited in the V1 stock flow.</p>
        ) : (
          <EditSaleInvoiceForm invoice={invoice} shops={shops} invoiceDateParam={invoiceDate} />
        )}
      </Panel>
    </>
  );
}

async function EditSaleInvoiceForm({
  invoice,
  shops,
  invoiceDateParam
}: {
  invoice: EditableInvoice;
  shops: { id: string; name: string }[];
  invoiceDateParam?: string;
}) {
  if (!invoice.vehicleId || !invoice.vehicle) return null;

  const today = toDateInputValue(startOfToday());
  const selectedInvoiceDate = invoiceDateParam && invoiceDateParam <= today ? invoiceDateParam : toDateInputValue(invoice.invoiceDate);
  const stockRows = await getVehicleStockRows(invoice.vehicleId, dateInputToDate(selectedInvoiceDate));
  const rowsByBatch = new Map(stockRows.map((row) => [row.batchId, { ...row }]));

  for (const item of invoice.items) {
    const existing = rowsByBatch.get(item.batchId);
    if (existing) {
      existing.balance += item.quantity;
    } else {
      rowsByBatch.set(item.batchId, {
        productId: item.productId,
        batchId: item.batchId,
        productName: item.batch.product.name,
        measurement: item.batch.product.measurement,
        supplierName: item.batch.product.supplier.name,
        barcode: item.batch.product.barcode,
        itemCode: item.batch.product.itemCode,
        sellingPrice: item.batch.product.sellingPrice,
        expiryDate: item.batch.expiryDate,
        balance: item.quantity
      });
    }
  }

  const serializedStockRows = Array.from(rowsByBatch.values()).map(({ expiryDate, sellingPrice, ...row }) => ({
    ...row,
    expiryLabel: displayDate(expiryDate),
    sellingPrice: Number(sellingPrice),
    priceLabel: money(sellingPrice)
  }));

  return (
    <VehicleInvoiceForm
      mode="edit"
      invoiceId={invoice.id}
      vehicleId={invoice.vehicleId}
      vehicleName={invoice.vehicle.nameOrNumber}
      shops={shops}
      stockRows={serializedStockRows}
      defaultShopId={invoice.shopId}
      defaultInvoiceDate={selectedInvoiceDate}
      maxInvoiceDate={today}
      dateChangePath={`/invoices/${invoice.id}/edit`}
      initialItems={invoice.items.map((item) => ({ batchId: item.batchId, quantity: item.quantity }))}
    />
  );
}
