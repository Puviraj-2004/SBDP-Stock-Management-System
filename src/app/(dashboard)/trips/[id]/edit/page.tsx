import { notFound } from "next/navigation";
import { Button, Field, Input, PageHeader, Panel, Select } from "@/components/ui";
import { updateTripAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { displayDate, toDateInputValue } from "@/lib/dates";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trip, vehicles, suppliers] = await Promise.all([
    prisma.loadingTrip.findUnique({ where: { id }, include: { vehicle: true } }),
    prisma.vehicle.findMany({ orderBy: { nameOrNumber: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!trip) notFound();

  return (
    <>
      <PageHeader title="Edit trip" description={`${displayDate(trip.tripDate)} · ${trip.vehicle.nameOrNumber}`} />
      <Panel className="max-w-xl">
        {trip.status === "closed" ? (
          <p className="text-sm text-muted">Closed trips cannot be edited.</p>
        ) : (
          <form action={updateTripAction} className="grid gap-3">
            <input type="hidden" name="id" value={trip.id} />
            <Field label="Vehicle">
              <Select name="vehicleId" defaultValue={trip.vehicleId} required>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.nameOrNumber}</option>)}
              </Select>
            </Field>
            <Field label="Supplier reference">
              <Select name="supplierId" defaultValue={trip.supplierId ?? ""}>
                <option value="">Mixed products</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            <Field label="Trip date"><Input name="tripDate" type="date" defaultValue={toDateInputValue(trip.tripDate)} required /></Field>
            <Button type="submit">Save trip</Button>
          </form>
        )}
      </Panel>
    </>
  );
}
