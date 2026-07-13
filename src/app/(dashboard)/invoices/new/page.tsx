import { InvoiceCreateSwitcher } from "@/components/InvoiceCreateSwitcher";
import { PageHeader, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { dateInputToDate, displayDate, money, startOfToday, toDateInputValue } from "@/lib/dates";
import { getVehicleStockRows } from "@/lib/stockLedger";

export default async function NewInvoicePage({
  searchParams
}: {
  searchParams: Promise<{ vehicleId?: string; type?: string; shopId?: string; invoiceDate?: string }>;
}) {
  const [{ vehicleId, type, shopId, invoiceDate }, shops, vehicles] = await Promise.all([
    searchParams,
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ orderBy: { nameOrNumber: "asc" } })
  ]);
  const selectedVehicleId = vehicleId || vehicles[0]?.id || "";
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const defaultType = type === "old" || type === "opening" ? "opening" : "sale";
  const today = toDateInputValue(startOfToday());
  const selectedInvoiceDate = invoiceDate && invoiceDate <= today ? invoiceDate : today;
  const stockRows = selectedVehicleId ? await getVehicleStockRows(selectedVehicleId, dateInputToDate(selectedInvoiceDate)) : [];
  const serializedStockRows = stockRows.map(({ expiryDate, sellingPrice, ...row }) => ({
    ...row,
    expiryLabel: displayDate(expiryDate),
    sellingPrice: Number(sellingPrice),
    priceLabel: money(sellingPrice)
  }));

  return (
    <>
      <PageHeader
        title="Create invoice"
        description="Create a vehicle sale invoice or enter an old opening invoice."
      />
      <Panel>
        <InvoiceCreateSwitcher
          defaultType={defaultType}
          vehicleId={selectedVehicle?.id ?? ""}
          vehicleName={selectedVehicle?.nameOrNumber ?? ""}
          vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, nameOrNumber: vehicle.nameOrNumber }))}
          shops={shops.map((shop) => ({ id: shop.id, name: shop.name }))}
          stockRows={serializedStockRows}
          defaultShopId={shopId ?? ""}
          defaultInvoiceDate={selectedInvoiceDate}
          maxInvoiceDate={today}
        />
      </Panel>
    </>
  );
}
