import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ReconciliationTable } from "@/components/ReconciliationTable";
import { TripLoadItemForm } from "@/components/TripLoadItemForm";
import { Badge, Button, Field, Input, LinkButton, PageHeader, Panel, Table } from "@/components/ui";
import { cancelOpenTripAction, closeTripAction, removeTripItemAction, updateTripItemAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { displayDate, startOfToday, toDateInputValue } from "@/lib/dates";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.loadingTrip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      supplier: true,
      items: { include: { batch: { include: { product: { include: { supplier: true } } } } }, orderBy: { id: "asc" } }
    }
  });
  if (!trip) notFound();

  const batches = await prisma.productBatch.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { gte: startOfToday() },
      ...(trip.supplierId ? { product: { supplierId: trip.supplierId } } : {})
    },
    include: { product: { include: { supplier: true } } },
    orderBy: [{ product: { name: "asc" } }, { expiryDate: "asc" }]
  });

  return (
    <>
      <PageHeader
        title={`Trip - ${trip.vehicle.nameOrNumber}`}
        description={`${displayDate(trip.tripDate)} - ${trip.supplier?.name ?? "mixed products"}`}
        action={
          trip.status === "loaded" ? (
            <div className="flex gap-2">
              <LinkButton href={`/trips/${trip.id}/edit`} variant="secondary">Edit trip</LinkButton>
              <form action={cancelOpenTripAction}>
                <input type="hidden" name="id" value={trip.id} />
                <ConfirmSubmitButton type="submit" message="Cancel this trip and return loaded stock?">Cancel trip</ConfirmSubmitButton>
              </form>
            </div>
          ) : null
        }
      />
      <Panel className="mb-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-semibold">Trip stock movement</h2>
          <Badge tone={trip.status === "closed" ? "green" : "amber"}>{trip.status}</Badge>
        </div>
        <Table headers={["Product", "Batch expiry", "Loaded", "Returned", "Expected sold", "Action"]}>
          {trip.items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2">{item.batch.product.name} {item.batch.product.measurement}<div className="text-xs text-muted">{item.batch.product.supplier.name}</div></td>
              <td className="px-3 py-2 tabular">{displayDate(item.batch.expiryDate)}</td>
              <td className="px-3 py-2 tabular">
                {trip.status === "loaded" ? (
                  <form action={updateTripItemAction} className="flex gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="quantityLoaded" type="number" min="1" defaultValue={item.quantityLoaded} className="h-9 w-24" />
                    <Button type="submit" variant="secondary" className="h-9">Save</Button>
                  </form>
                ) : item.quantityLoaded}
              </td>
              <td className="px-3 py-2 tabular">{item.quantityReturned ?? "-"}</td>
              <td className="px-3 py-2 tabular">{item.quantityLoaded - (item.quantityReturned ?? 0)}</td>
              <td className="px-3 py-2">
                {trip.status === "loaded" ? (
                  <form action={removeTripItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <ConfirmSubmitButton type="submit" message="Remove this item from the trip?" className="h-9">Remove</ConfirmSubmitButton>
                  </form>
                ) : "-"}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
      {trip.status === "loaded" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="amber">Step 1</Badge>
              <h2 className="font-semibold">Load vehicle</h2>
            </div>
            <TripLoadItemForm
              tripId={trip.id}
              supplierId={trip.supplierId}
              batches={batches.map((batch) => ({
                id: batch.id,
                productId: batch.productId,
                productName: batch.product.name,
                measurement: batch.product.measurement,
                supplierId: batch.product.supplierId,
                supplierName: batch.product.supplier.name,
                barcode: batch.product.barcode,
                itemCode: batch.product.itemCode,
                quantity: batch.quantity,
                expiryDate: toDateInputValue(batch.expiryDate)
              }))}
            />
          </Panel>
          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="green">Step 2</Badge>
              <h2 className="font-semibold">Return stock and close</h2>
            </div>
            <form action={closeTripAction} className="grid gap-3">
              <input type="hidden" name="tripId" value={trip.id} />
              {trip.items.map((item) => (
                <Field key={item.id} label={`${item.batch.product.name} ${item.batch.product.measurement} returned`}>
                  <Input name={`returned-${item.id}`} type="number" min="0" max={item.quantityLoaded} placeholder="Enter returned qty" required />
                </Field>
              ))}
              <ConfirmSubmitButton type="submit" message="Close this trip with the entered returns?">Save returns and close</ConfirmSubmitButton>
            </form>
          </Panel>
        </div>
      ) : (
        <Panel><ReconciliationTable tripId={trip.id} /></Panel>
      )}
    </>
  );
}
