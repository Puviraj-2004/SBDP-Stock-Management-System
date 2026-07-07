import { TripsTable } from "@/components/TripsTable";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";

export default async function TripsPage() {
  const trips = await prisma.loadingTrip.findMany({
    include: { vehicle: true, supplier: true, _count: { select: { items: true, invoices: true } } },
    orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }],
    take: 200
  });

  return (
    <>
      <PageHeader title="Trips" description="Each trip is independent, even when a vehicle goes out more than once in a day." action={<LinkButton href="/trips/new">Start trip</LinkButton>} />
      <TripsTable
        rows={trips.map((trip) => ({
          id: trip.id,
          date: toDateInputValue(trip.tripDate),
          vehicle: trip.vehicle.nameOrNumber,
          supplier: trip.supplier?.name ?? "Mixed",
          itemCount: trip._count.items,
          invoiceCount: trip._count.invoices,
          status: trip.status
        }))}
      />
    </>
  );
}
