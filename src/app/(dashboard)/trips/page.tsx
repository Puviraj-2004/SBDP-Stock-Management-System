import { TripsTable } from "@/components/TripsTable";
import { PaginationControls } from "@/components/PaginationControls";
import { LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, getPageCount, getPagination, parsePage } from "@/lib/pagination";

export default async function TripsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const [trips, totalTrips] = await Promise.all([
    prisma.loadingTrip.findMany({
      include: { vehicle: true, supplier: true, _count: { select: { items: true, invoices: true } } },
      orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }],
      ...getPagination(page)
    }),
    prisma.loadingTrip.count()
  ]);

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
      <div className="mt-4">
        <PaginationControls
          pathname="/trips"
          page={page}
          pageCount={getPageCount(totalTrips)}
          total={totalTrips}
          pageSize={DEFAULT_PAGE_SIZE}
        />
      </div>
    </>
  );
}
