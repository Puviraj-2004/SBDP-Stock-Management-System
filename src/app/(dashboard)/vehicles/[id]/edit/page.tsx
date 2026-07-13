import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel } from "@/components/ui";
import { deleteVehicleAction, updateVehicleAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { _count: { select: { loads: true, returns: true, invoices: true, ledgerEntries: true } } }
  });
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader title="Edit vehicle" description={vehicle.nameOrNumber} />
      <Panel className="max-w-xl">
        <form action={updateVehicleAction} className="grid gap-3">
          <input type="hidden" name="id" value={vehicle.id} />
          <Field label="Name or number"><Input name="nameOrNumber" defaultValue={vehicle.nameOrNumber} required /></Field>
          <Button type="submit">Save vehicle</Button>
        </form>
        {vehicle._count.loads === 0 && vehicle._count.returns === 0 && vehicle._count.invoices === 0 && vehicle._count.ledgerEntries === 0 ? (
          <form action={deleteVehicleAction} className="mt-4">
            <input type="hidden" name="id" value={vehicle.id} />
            <ConfirmSubmitButton type="submit" message={`Delete ${vehicle.nameOrNumber}?`}>Delete vehicle</ConfirmSubmitButton>
          </form>
        ) : null}
      </Panel>
    </>
  );
}
