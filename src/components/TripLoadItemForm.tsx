"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { Button, Field, Input, Select } from "@/components/ui";
import { addTripItemFormAction } from "@/lib/actions";
import { displayDate } from "@/lib/dates";

type BatchOption = {
  id: string;
  productId: string;
  productName: string;
  measurement: string;
  supplierId: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  quantity: number;
  expiryDate: string;
};

export function TripLoadItemForm({
  tripId,
  supplierId,
  batches
}: {
  tripId: string;
  supplierId: string | null;
  batches: BatchOption[];
}) {
  const [scanCode, setScanCode] = useState("");
  const [batchId, setBatchId] = useState("");
  const [quantityLoaded, setQuantityLoaded] = useState("");
  const [clientError, setClientError] = useState("");
  const [hideActionError, setHideActionError] = useState(false);
  const [actionState, formAction, isPending] = useActionState(addTripItemFormAction, {});
  const selectedBatch = batches.find((batch) => batch.id === batchId);
  const actionError = actionState.ok === false ? actionState.message ?? "Unable to add trip item." : "";
  const errorMessage = clientError || (!hideActionError ? actionError : "");

  const productMatches = useMemo(() => {
    const code = scanCode.trim().toLowerCase();
    if (!code) return [];

    const productIds = new Set<string>();
    return batches.filter((batch) => {
      const matched =
        batch.barcode?.toLowerCase() === code ||
        batch.itemCode?.toLowerCase() === code;
      if (!matched || productIds.has(batch.productId)) return false;
      productIds.add(batch.productId);
      return true;
    });
  }, [batches, scanCode]);

  const visibleBatches = useMemo(() => {
    const code = scanCode.trim().toLowerCase();
    if (!code) return batches;

    return batches.filter(
      (batch) =>
        batch.barcode?.toLowerCase() === code ||
        batch.itemCode?.toLowerCase() === code
    );
  }, [batches, scanCode]);

  function selectBatchByCode(nextValue: string) {
    const code = nextValue.trim().toLowerCase();
    if (!code) {
      setBatchId("");
      return;
    }

    const matchingBatches = batches.filter(
      (batch) =>
        batch.barcode?.toLowerCase() === code ||
        batch.itemCode?.toLowerCase() === code
    );

    if (matchingBatches.length > 0) {
      const sorted = [...matchingBatches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
      setBatchId(sorted[0].id);
    } else {
      setBatchId("");
    }
  }

  function handleScan(nextValue: string) {
    setScanCode(nextValue);
    selectBatchByCode(nextValue);
  }

  useEffect(() => {
    if (!actionState.ok) return;
    setScanCode("");
    setBatchId("");
    setQuantityLoaded("");
    setClientError("");
  }, [actionState]);

  useEffect(() => {
    if (actionError) setHideActionError(false);
  }, [actionError]);

  return (
    <form
      action={formAction}
      className="grid gap-3"
      onSubmit={(event) => {
        setClientError("");
        const quantity = Number(quantityLoaded);
        if (selectedBatch && quantity > selectedBatch.quantity) {
          event.preventDefault();
          setClientError(`Only ${selectedBatch.quantity} items are available in this batch.`);
        }
      }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      {errorMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-sm rounded-md border border-red-200 bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-red-700">Cannot add item</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{errorMessage}</p>
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setClientError("");
                  setHideActionError(true);
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {supplierId ? (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
          Showing products from selected supplier only.
        </div>
      ) : null}
      <BarcodeScanInput
        submitOnEnter={false}
        submitOnScan={false}
        onValueChange={handleScan}
        onCommit={selectBatchByCode}
      />

      {scanCode.trim() && productMatches.length === 0 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          No available batch found for this barcode or item code.
        </div>
      ) : null}

      {productMatches.length > 1 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Multiple products match this code. Select the correct batch.
        </div>
      ) : null}

      <Field label="Batch">
        <Select name="batchId" value={batchId} onChange={(event) => setBatchId(event.target.value)} required>
          <option value="">Select batch</option>
          {visibleBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.productName} {batch.measurement} - {batch.supplierName} - qty {batch.quantity} - exp {displayDate(batch.expiryDate)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Quantity loaded" hint={selectedBatch ? `Available: ${selectedBatch.quantity}` : undefined}>
        <Input
          name="quantityLoaded"
          type="number"
          min="1"
          max={selectedBatch?.quantity}
          value={quantityLoaded}
          onChange={(event) => setQuantityLoaded(event.target.value)}
          required
        />
      </Field>
      <Button type="submit" disabled={isPending}>{isPending ? "Adding..." : "Add item"}</Button>
    </form>
  );
}
