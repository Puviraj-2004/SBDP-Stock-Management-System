import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel, Table } from "@/components/ui";
import { createVehicleAction, deleteVehicleAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    include: { _count: { select: { trips: true } } },
    orderBy: { nameOrNumber: "asc" }
  });
  return (
    <>
      <PageHeader title="Vehicles" description="Vehicles can have multiple independent trips on the same day." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel>
          <h2 className="mb-3 font-semibold">Add vehicle</h2>
          <form action={createVehicleAction} className="grid gap-3">
            <Field label="Name or number"><Input name="nameOrNumber" required /></Field>
            <Button type="submit">Save vehicle</Button>
          </form>
        </Panel>
        <Table headers={["Vehicle", "Trips", "Actions"]}>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td className="px-3 py-2 font-medium">{vehicle.nameOrNumber}</td>
              <td className="px-3 py-2 tabular">{vehicle._count.trips}</td>
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
                  {vehicle._count.trips === 0 ? (
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
          ))}
        </Table>
      </div>
    </>
  );
}
