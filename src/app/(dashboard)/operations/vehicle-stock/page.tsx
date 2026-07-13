import { VehicleStockWorkPage } from "@/components/VehicleStockWorkPage";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { displayDate, startOfToday, toDateInputValue } from "@/lib/dates";
import { getVehicleStockRows, getWarehouseBalancesByBatchIds } from "@/lib/stockLedger";

const allPostedMovementsDate = new Date(Date.UTC(9999, 11, 31));

export default async function VehicleStockPage({
  searchParams
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const [{ vehicleId }, vehicles] = await Promise.all([
    searchParams,
    prisma.vehicle.findMany({ orderBy: { nameOrNumber: "asc" } })
  ]);
  const selectedVehicleId = vehicleId || vehicles[0]?.id || "";
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const [rows, batches, recentLoads, recentReturns] = await Promise.all([
    selectedVehicleId ? getVehicleStockRows(selectedVehicleId, allPostedMovementsDate) : [],
    prisma.productBatch.findMany({
      include: { product: { include: { supplier: true } } },
      orderBy: [{ product: { name: "asc" } }, { expiryDate: "asc" }]
    }),
    selectedVehicleId
      ? prisma.vehicleLoad.findMany({
          where: { vehicleId: selectedVehicleId },
          include: {
            items: {
              include: { batch: { include: { product: true } } },
              orderBy: { id: "asc" }
            }
          },
          orderBy: [{ loadDate: "desc" }, { createdAt: "desc" }],
          take: 8
        })
      : [],
    selectedVehicleId
      ? prisma.vehicleReturn.findMany({
          where: { vehicleId: selectedVehicleId },
          include: {
            items: {
              include: { batch: { include: { product: true } } },
              orderBy: { id: "asc" }
            }
          },
          orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
          take: 8
        })
      : []
  ]);
  const warehouseBalances = await getWarehouseBalancesByBatchIds(batches.map((batch) => batch.id), allPostedMovementsDate);
  const availableBatches = batches.filter((batch) => (warehouseBalances.get(batch.id) ?? 0) > 0);

  return (
    <>
      <PageHeader
        title="Vehicle stock"
        description="Select a vehicle, load stock, return stock, and review recent loads."
      />
      <VehicleStockWorkPage
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        selectedVehicleName={selectedVehicle?.nameOrNumber ?? ""}
        today={toDateInputValue(startOfToday())}
        stockRows={rows.map((row) => ({
          batchId: row.batchId,
          productName: row.productName,
          measurement: row.measurement,
          supplierName: row.supplierName,
          barcode: row.barcode,
          itemCode: row.itemCode,
          expiryLabel: displayDate(row.expiryDate),
          balance: row.balance
        }))}
        loadBatches={availableBatches.map((batch) => ({
          id: batch.id,
          productName: batch.product.name,
          measurement: batch.product.measurement,
          supplierName: batch.product.supplier.name,
          barcode: batch.product.barcode,
          itemCode: batch.product.itemCode,
          expiryLabel: displayDate(batch.expiryDate),
          warehouseBalance: warehouseBalances.get(batch.id) ?? 0
        }))}
        recentLoads={recentLoads.map((load) => ({
          id: load.id,
          dateLabel: displayDate(load.loadDate),
          batchId: load.items[0]?.batchId,
          summary: load.items
            .map((item) => `${item.batch.product.name} ${item.batch.product.measurement} - ${item.quantityLoaded} units`)
            .join(" / ")
        }))}
        recentReturns={recentReturns.map((vehicleReturn) => ({
          id: vehicleReturn.id,
          dateLabel: displayDate(vehicleReturn.returnDate),
          notes: vehicleReturn.notes,
          summary: vehicleReturn.items
            .map((item) => `${item.batch.product.name} ${item.batch.product.measurement} - ${item.quantityReturned} units`)
            .join(" / ")
        }))}
      />
    </>
  );
}
