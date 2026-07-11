import { createOpeningInvoiceAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { startOfToday, toDateInputValue } from "@/lib/dates";
import { Button, Field, Input, PageHeader, Panel, Select, TextArea } from "@/components/ui";

export default async function OldInvoicePage({
  searchParams
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const [{ shopId }, shops] = await Promise.all([
    searchParams,
    prisma.shop.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <>
      <PageHeader
        title="Add old invoice"
        description="Enter unpaid or partially paid old bills without changing stock, trips, or product batches."
      />
      <Panel className="max-w-2xl">
        <form action={createOpeningInvoiceAction} className="grid gap-3">
          <Field label="Shop">
            <Select name="shopId" defaultValue={shopId ?? ""} required>
              <option value="">Select shop</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Old invoice date">
              <Input name="invoiceDate" type="date" defaultValue={toDateInputValue(startOfToday())} required />
            </Field>
            <Field label="Reference number">
              <Input name="referenceNumber" placeholder="Old bill number" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Old invoice amount">
              <Input name="totalAmount" type="number" min="0" step="0.01" required />
            </Field>
            <Field label="Already paid amount" hint="Use only for partially paid old bills. Leave 0 for unpaid.">
              <Input name="alreadyPaidAmount" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
          </div>
          <Field label="Details">
            <TextArea name="notes" placeholder="Optional old invoice details" />
          </Field>
          <div className="rounded-md border border-line bg-[#f7f4ed] p-3 text-sm text-muted">
            Old invoices do not change stock and do not need products or trips. Payments can close them later through the shop account.
          </div>
          <Button type="submit">Save old invoice</Button>
        </form>
      </Panel>
    </>
  );
}
