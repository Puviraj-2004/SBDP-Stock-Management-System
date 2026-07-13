"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Button, Field, Input, Select } from "@/components/ui";
import { createVehicleLoadFormAction, createVehicleReturnFormAction, deleteVehicleReturnAction } from "@/lib/actions";

type VehicleOption = {
  id: string;
  nameOrNumber: string;
};

type VehicleStockRow = {
  batchId: string;
  productName: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  expiryLabel: string;
  balance: number;
};

type LoadBatchOption = {
  id: string;
  productName: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  expiryLabel: string;
  warehouseBalance: number;
};

type RecentLoad = {
  id: string;
  dateLabel: string;
  summary: string;
  batchId?: string;
};

type RecentReturn = {
  id: string;
  dateLabel: string;
  summary: string;
  notes: string | null;
};

type DialogMode =
  | { type: "load"; batchId?: string }
  | { type: "return"; row: VehicleStockRow }
  | null;

export function VehicleStockWorkPage({
  vehicles,
  selectedVehicleId,
  selectedVehicleName,
  stockRows,
  loadBatches,
  recentLoads,
  recentReturns,
  today
}: {
  vehicles: VehicleOption[];
  selectedVehicleId: string;
  selectedVehicleName: string;
  stockRows: VehicleStockRow[];
  loadBatches: LoadBatchOption[];
  recentLoads: RecentLoad[];
  recentReturns: RecentReturn[];
  today: string;
}) {
  const [dialog, setDialog] = useState<DialogMode>(null);
  const router = useRouter();
  const selectedVehicle = selectedVehicleId ? `/operations/vehicle-stock?vehicleId=${selectedVehicleId}` : "/operations/vehicle-stock";

  const stockTotal = useMemo(() => stockRows.reduce((sum, row) => sum + row.balance, 0), [stockRows]);

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <form className="grid gap-1.5">
          <label className="text-sm font-medium text-muted" htmlFor="vehicleId">Vehicle</label>
          <Select
            id="vehicleId"
            name="vehicleId"
            defaultValue={selectedVehicleId}
            className="min-w-56"
            onChange={(event) => router.push(`/operations/vehicle-stock?vehicleId=${event.target.value}`)}
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.nameOrNumber}</option>
            ))}
          </Select>
        </form>
        <Button type="button" onClick={() => setDialog({ type: "load" })} disabled={!selectedVehicleId || loadBatches.length === 0}>
          <PackagePlus size={16} />
          Load vehicle
        </Button>
      </section>

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-muted">Current stock</h2>
          <div className="text-sm font-medium text-muted">{stockTotal} units</div>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white">
          {stockRows.length === 0 ? (
            <div className="p-4 text-sm text-muted">
              No stock in this vehicle. Load stock to start selling.
            </div>
          ) : (
            stockRows.map((row) => (
              <div key={row.batchId} className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_210px] md:items-center">
                <div>
                  <div className="font-semibold">{row.productName} {row.measurement}</div>
                  <div className="mt-1 text-sm text-muted">
                    {row.supplierName} - exp {row.expiryLabel}
                    {row.barcode || row.itemCode ? ` - ${row.barcode ?? row.itemCode}` : ""}
                  </div>
                </div>
                <div className="text-lg font-semibold tabular md:text-right">{row.balance} units</div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setDialog({ type: "load", batchId: row.batchId })}>
                    Load more
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setDialog({ type: "return", row })}>
                    <RotateCcw size={15} />
                    Return
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-muted">Recent loads</h2>
          <div className="text-sm text-muted">Newest first</div>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white">
          {recentLoads.length === 0 ? (
            <div className="p-4 text-sm text-muted">No load records for this vehicle yet.</div>
          ) : (
            recentLoads.map((load) => (
              <div key={load.id} className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_130px] md:items-center">
                <div>
                  <div className="font-medium">{load.dateLabel}</div>
                  <div className="mt-1 text-sm text-muted">{load.summary}</div>
                </div>
                <Button type="button" variant="secondary" onClick={() => setDialog({ type: "load", batchId: load.batchId })}>
                  Load more
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-muted">Recent returns</h2>
          <div className="text-sm text-muted">Newest first</div>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white">
          {recentReturns.length === 0 ? (
            <div className="p-4 text-sm text-muted">No return records for this vehicle yet.</div>
          ) : (
            recentReturns.map((vehicleReturn) => (
              <div key={vehicleReturn.id} className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_44px] md:items-center">
                <div>
                  <div className="font-medium">{vehicleReturn.dateLabel}</div>
                  <div className="mt-1 text-sm text-muted">{vehicleReturn.summary}</div>
                  {vehicleReturn.notes ? <div className="mt-1 text-xs text-muted">Note: {vehicleReturn.notes}</div> : null}
                </div>
                <form action={deleteVehicleReturnAction} className="md:justify-self-end">
                  <input type="hidden" name="returnId" value={vehicleReturn.id} />
                  <input type="hidden" name="redirectTo" value={selectedVehicle} />
                  <ConfirmSubmitButton
                    type="submit"
                    variant="danger"
                    className="h-9 w-9 px-0"
                    title="Delete return"
                    aria-label="Delete return"
                    message="Delete this return record? Vehicle and warehouse stock will update."
                  >
                    <Trash2 size={15} />
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      {dialog?.type === "load" ? (
        <LoadDialog
          vehicleId={selectedVehicleId}
          vehicleName={selectedVehicleName}
          today={today}
          redirectTo={selectedVehicle}
          batches={loadBatches}
          defaultBatchId={dialog.batchId}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === "return" ? (
        <ReturnDialog
          vehicleId={selectedVehicleId}
          vehicleName={selectedVehicleName}
          today={today}
          redirectTo={selectedVehicle}
          row={dialog.row}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-line bg-[#f7f4ee] p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close">x</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadDialog({
  vehicleId,
  vehicleName,
  today,
  redirectTo,
  batches,
  defaultBatchId,
  onClose
}: {
  vehicleId: string;
  vehicleName: string;
  today: string;
  redirectTo: string;
  batches: LoadBatchOption[];
  defaultBatchId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId ?? "");
  const [scanMessage, setScanMessage] = useState("");
  const [state, formAction, pending] = useActionState(createVehicleLoadFormAction, {});

  useEffect(() => {
    setSelectedBatchId(defaultBatchId ?? "");
  }, [defaultBatchId]);

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [state.ok, router, onClose]);

  function selectScannedBatch(code: string) {
    const scanned = code.trim().toLowerCase();
    if (!scanned) return;

    const matches = batches.filter((batch) =>
      [batch.barcode, batch.itemCode].some((value) => value?.toLowerCase() === scanned)
    );

    if (matches.length === 1) {
      setSelectedBatchId(matches[0].id);
      setScanMessage(`${matches[0].productName} ${matches[0].measurement} selected.`);
      return;
    }

    if (matches.length > 1) {
      setSelectedBatchId(matches[0].id);
      setScanMessage(`${matches.length} batches found. Oldest expiry batch selected; confirm before saving.`);
      return;
    }

    setScanMessage("No warehouse batch found for this barcode or item code.");
  }

  return (
    <Modal title="Load vehicle" onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Vehicle">
            <Input value={vehicleName} readOnly />
          </Field>
          <Field label="Load date">
            <DatePickerInput name="loadDate" defaultValue={today} maxDate={today} required />
          </Field>
        </div>
        <BarcodeScanInput
          name="scan"
          submitOnEnter={false}
          submitOnScan={false}
          onCommit={selectScannedBatch}
        />
        {scanMessage ? <div className="rounded-md bg-[#e7e2d8] p-3 text-sm text-ink">{scanMessage}</div> : null}
        <Field label="Batch">
          <Select name="batchId" value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} required>
            <option value="">Select batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.productName} {batch.measurement} - {batch.supplierName} - exp {batch.expiryLabel} - warehouse {batch.warehouseBalance}
                {batch.barcode || batch.itemCode ? ` - ${batch.barcode ?? batch.itemCode}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity to load">
          <Input name="quantityLoaded" type="number" min="1" required />
        </Field>
        {state.message ? (
          <div className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {state.message}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save load"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReturnDialog({
  vehicleId,
  vehicleName,
  today,
  redirectTo,
  row,
  onClose
}: {
  vehicleId: string;
  vehicleName: string;
  today: string;
  redirectTo: string;
  row: VehicleStockRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createVehicleReturnFormAction, {});

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [state.ok, router, onClose]);

  return (
    <Modal title="Return to warehouse" onClose={onClose}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <input type="hidden" name="batch-0" value={row.batchId} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Vehicle">
            <Input value={vehicleName} readOnly />
          </Field>
          <Field label="Return date">
            <DatePickerInput name="returnDate" defaultValue={today} required />
          </Field>
        </div>
        <div className="rounded-md border border-line bg-white p-3 text-sm">
          <div className="font-semibold">{row.productName} {row.measurement}</div>
          <div className="mt-1 text-muted">{row.supplierName} - exp {row.expiryLabel}</div>
          <div className="mt-2 font-medium tabular">Vehicle balance: {row.balance}</div>
        </div>
        <Field label="Return quantity">
          <Input name="quantity-0" type="number" min="1" max={row.balance} required />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </Field>
        {state.message ? (
          <div className={`rounded-md p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {state.message}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save return"}</Button>
        </div>
      </form>
    </Modal>
  );
}
