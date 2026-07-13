"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePickerInput } from "@/components/DatePickerInput";
import { VehicleInvoiceForm } from "@/components/VehicleInvoiceForm";
import { Button, Field, Input, LinkButton, Select, TextArea } from "@/components/ui";
import { createOpeningInvoiceFormAction } from "@/lib/actions";

type ShopOption = {
  id: string;
  name: string;
};

type VehicleOption = {
  id: string;
  nameOrNumber: string;
};

type StockOption = {
  batchId: string;
  productName: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  expiryLabel: string;
  balance: number;
  sellingPrice: number;
  priceLabel: string;
};

function displayDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function InvoiceCreateSwitcher({
  shops,
  vehicles,
  vehicleId,
  vehicleName,
  stockRows,
  defaultInvoiceDate,
  maxInvoiceDate,
  defaultShopId = "",
  defaultType = "sale"
}: {
  shops: ShopOption[];
  vehicles: VehicleOption[];
  vehicleId: string;
  vehicleName: string;
  stockRows: StockOption[];
  defaultInvoiceDate: string;
  maxInvoiceDate: string;
  defaultShopId?: string;
  defaultType?: "sale" | "opening";
}) {
  const [invoiceType, setInvoiceType] = useState<"sale" | "opening">(defaultType);
  const router = useRouter();
  const selectedTypeParam = invoiceType === "opening" ? "&type=old" : "";

  function saleUrl(next: { vehicleId?: string; invoiceDate?: string }) {
    const params = new URLSearchParams();
    params.set("vehicleId", next.vehicleId ?? vehicleId);
    params.set("invoiceDate", next.invoiceDate ?? defaultInvoiceDate);
    if (defaultShopId) params.set("shopId", defaultShopId);
    return `/invoices/new?${params.toString()}${selectedTypeParam}`;
  }

  return (
    <div className="grid gap-4">
      <div className="inline-grid max-w-sm grid-cols-2 overflow-hidden rounded-md border border-line bg-white p-1">
        <button
          type="button"
          className={invoiceType === "sale" ? "rounded bg-accent px-3 py-2 text-sm font-medium text-white" : "rounded px-3 py-2 text-sm font-medium text-ink"}
          onClick={() => setInvoiceType("sale")}
        >
          Sale invoice
        </button>
        <button
          type="button"
          className={invoiceType === "opening" ? "rounded bg-accent px-3 py-2 text-sm font-medium text-white" : "rounded px-3 py-2 text-sm font-medium text-ink"}
          onClick={() => setInvoiceType("opening")}
        >
          Old invoice
        </button>
      </div>

      {invoiceType === "opening" ? (
        <OpeningInvoiceForm shops={shops} defaultInvoiceDate={defaultInvoiceDate} maxInvoiceDate={maxInvoiceDate} defaultShopId={defaultShopId} />
      ) : !vehicleId ? (
        <div className="grid gap-3 text-sm text-muted">
          <Field label="Vehicle">
            <Select
              value={vehicleId}
              onChange={(event) => router.push(saleUrl({ vehicleId: event.target.value }))}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.nameOrNumber}</option>
              ))}
            </Select>
          </Field>
          <p>Add a vehicle before creating sale invoices.</p>
        </div>
      ) : stockRows.length === 0 ? (
        <div className="grid gap-3 text-sm text-muted">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Vehicle">
              <Select
                value={vehicleId}
                onChange={(event) => router.push(saleUrl({ vehicleId: event.target.value }))}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.nameOrNumber}</option>
                ))}
              </Select>
            </Field>
            <Field label="Invoice date">
              <DatePickerInput
                defaultValue={defaultInvoiceDate}
                maxDate={maxInvoiceDate}
                onDateChange={(nextDate) => {
                  if (nextDate) router.push(saleUrl({ invoiceDate: nextDate }));
                }}
                required
              />
            </Field>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No products available for {vehicleName} on {displayDate(defaultInvoiceDate)}. Select the correct invoice date or load stock for this vehicle.
          </div>
          <div>
            <LinkButton href={`/operations/vehicle-stock?vehicleId=${vehicleId}`}>Vehicle stock</LinkButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <Field label="Vehicle">
            <Select
              value={vehicleId}
              onChange={(event) => router.push(saleUrl({ vehicleId: event.target.value }))}
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.nameOrNumber}</option>
              ))}
            </Select>
          </Field>
          <VehicleInvoiceForm
            mode="create"
            vehicleId={vehicleId}
            vehicleName={vehicleName}
            shops={shops}
            stockRows={stockRows}
            defaultShopId={defaultShopId}
            defaultInvoiceDate={defaultInvoiceDate}
            maxInvoiceDate={maxInvoiceDate}
            onInvoiceDateChange={(nextDate) => {
              if (nextDate) router.push(saleUrl({ invoiceDate: nextDate }));
            }}
          />
        </div>
      )}
    </div>
  );
}

function OpeningInvoiceForm({
  shops,
  defaultInvoiceDate,
  maxInvoiceDate,
  defaultShopId
}: {
  shops: ShopOption[];
  defaultInvoiceDate: string;
  maxInvoiceDate: string;
  defaultShopId: string;
}) {
  const [actionState, formAction, isPending] = useActionState(createOpeningInvoiceFormAction, {});

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Shop">
        <Select name="shopId" defaultValue={defaultShopId} required>
          <option value="">Select shop</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>{shop.name}</option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Old invoice date">
          <DatePickerInput name="invoiceDate" defaultValue={defaultInvoiceDate} maxDate={maxInvoiceDate} required />
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
        Old invoices do not change stock and do not need products, batches, or vehicle loads.
      </div>

      {actionState.message ? (
        <div className={`rounded-md p-3 text-sm ${actionState.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {actionState.message}
        </div>
      ) : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save old invoice"}</Button>
    </form>
  );
}
