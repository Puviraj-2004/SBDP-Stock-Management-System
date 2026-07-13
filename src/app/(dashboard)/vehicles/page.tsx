import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { VehicleCreateDialog } from "@/components/VehicleCreateDialog";
import { PageHeader, Table } from "@/components/ui";
import { deleteVehicleAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    include: { _count: { select: { loads: true, returns: true, invoices: true, ledgerEntries: true } } },
    orderBy: { nameOrNumber: "asc" }
  });
  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Vehicles can hold stock loaded from the warehouse."
        action={<VehicleCreateDialog />}
      />
      <div className="grid gap-5">
        <Table headers={["Vehicle", "Loads", "Returns", "Invoices", "Actions"]}>
          {vehicles.map((vehicle) => {
            const usageCount = vehicle._count.loads + vehicle._count.returns + vehicle._count.invoices + vehicle._count.ledgerEntries;
            return (
            <tr key={vehicle.id}>
              <td className="px-3 py-2 font-medium">{vehicle.nameOrNumber}</td>
              <td className="px-3 py-2 tabular">{vehicle._count.loads}</td>
              <td className="px-3 py-2 tabular">{vehicle._count.returns}</td>
              <td className="px-3 py-2 tabular">{vehicle._count.invoices}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/vehicles/${vehicle.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                    title="Edit vehicle"
                    aria-label={`Edit ${vehicle.nameOrNumber}`}
                  >
                    <Edit size={15} />
                  </Link>
                  {usageCount === 0 ? (
                    <form action={deleteVehicleAction}>
                      <input type="hidden" name="id" value={vehicle.id} />
                      <ConfirmSubmitButton
                        type="submit"
                        message={`Delete ${vehicle.nameOrNumber}?`}
                        className="h-8 w-8 px-0"
                        title="Delete vehicle"
                        aria-label={`Delete ${vehicle.nameOrNumber}`}
                      >
                        <Trash2 size={15} />
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          )})}
        </Table>
      </div>
    </>
  );
}
