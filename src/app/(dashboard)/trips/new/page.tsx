import { Button, Field, Input, PageHeader, Panel, Select } from "@/components/ui";
import { createTripAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { startOfToday, toDateInputValue } from "@/lib/dates";

export default async function NewTripPage() {
  const [vehicles, suppliers] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { nameOrNumber: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Start trip" description="Create the trip header, then add load items on the trip page." />
      <Panel className="max-w-xl">
        <form action={createTripAction} className="grid gap-3">
          <Field label="Vehicle"><Select name="vehicleId" required><option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.nameOrNumber}</option>)}</Select></Field>
          <Field label="Supplier reference"><Select name="supplierId"><option value="">Mixed products</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Trip date"><Input name="tripDate" type="date" defaultValue={toDateInputValue(startOfToday())} required /></Field>
          <Button type="submit">Create trip</Button>
        </form>
      </Panel>
    </>
  );
}
