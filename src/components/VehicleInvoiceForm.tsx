"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { ConfirmButton } from "@/components/ConfirmSubmitButton";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Button, Field, Input, Select, Table } from "@/components/ui";
import { createInvoiceFormAction, updateInvoiceFormAction } from "@/lib/actions";

type ShopOption = {
  id: string;
  name: string;
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

type InvoiceItemDraft = {
  batchId: string;
  quantity: number;
};

export function VehicleInvoiceForm({
  mode,
  invoiceId,
  vehicleId,
  vehicleName,
  shops,
  stockRows,
  defaultShopId = "",
  defaultInvoiceDate,
  maxInvoiceDate,
  onInvoiceDateChange,
  dateChangePath,
  initialItems = []
}: {
  mode: "create" | "edit";
  invoiceId?: string;
  vehicleId: string;
  vehicleName: string;
  shops: ShopOption[];
  stockRows: StockOption[];
  defaultShopId?: string;
  defaultInvoiceDate: string;
  maxInvoiceDate?: string;
  onInvoiceDateChange?: (date: string) => void;
  dateChangePath?: string;
  initialItems?: InvoiceItemDraft[];
}) {
  const router = useRouter();
  const [scanCode, setScanCode] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<InvoiceItemDraft[]>(initialItems);
  const [actionState, formAction, isPending] = useActionState(
    mode === "create" ? createInvoiceFormAction : updateInvoiceFormAction,
    {}
  );

  const usedByBatch = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.batchId, (map.get(item.batchId) ?? 0) + item.quantity);
    return map;
  }, [items]);

  const availableRows = useMemo(
    () => stockRows.filter((row) => row.balance - (usedByBatch.get(row.batchId) ?? 0) > 0),
    [stockRows, usedByBatch]
  );

  const scanMatches = useMemo(() => {
    const code = scanCode.trim().toLowerCase();
    if (!code) return [];
    return availableRows.filter(
      (row) => row.barcode?.toLowerCase() === code || row.itemCode?.toLowerCase() === code
    );
  }, [availableRows, scanCode]);

  const productChoices = scanCode.trim() ? scanMatches : availableRows;
  const selectedRow = stockRows.find((row) => row.batchId === selectedBatchId);
  const selectedAvailable = selectedRow ? selectedRow.balance - (usedByBatch.get(selectedRow.batchId) ?? 0) : 0;
  const total = items.reduce((sum, item) => {
    const row = stockRows.find((entry) => entry.batchId === item.batchId);
    return sum + item.quantity * (row?.sellingPrice ?? 0);
  }, 0);

  function selectByCode(value: string) {
    const code = value.trim().toLowerCase();
    if (!code) return;
    const exactMatches = availableRows.filter(
      (row) => row.barcode?.toLowerCase() === code || row.itemCode?.toLowerCase() === code
    );
    setSelectedBatchId(exactMatches.length === 1 ? exactMatches[0].batchId : "");
  }

  function addItem() {
    if (!selectedBatchId || quantity <= 0 || quantity > selectedAvailable) return;
    setItems((current) => {
      const existing = current.find((item) => item.batchId === selectedBatchId);
      if (existing) {
        return current.map((item) =>
          item.batchId === selectedBatchId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { batchId: selectedBatchId, quantity }];
    });
    setSelectedBatchId("");
    setScanCode("");
    setQuantity(1);
  }

  function removeItem(batchId: string) {
    setItems((current) => current.filter((item) => item.batchId !== batchId));
  }

  return (
    <form action={formAction} className="grid gap-5">
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Shop">
          <Select name="shopId" defaultValue={defaultShopId} required>
            <option value="">Select shop</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Vehicle">
          <Input value={vehicleName} readOnly />
        </Field>
        <Field label="Invoice date">
          <DatePickerInput
            name="invoiceDate"
            defaultValue={defaultInvoiceDate}
            maxDate={maxInvoiceDate}
            onDateChange={(nextDate) => {
              if (!nextDate) return;
              if (onInvoiceDateChange) {
                onInvoiceDateChange(nextDate);
                return;
              }
              if (dateChangePath) {
                router.push(`${dateChangePath}?invoiceDate=${nextDate}`);
              }
            }}
            required
          />
        </Field>
      </div>

      <div className="rounded-md border border-line bg-[#fbfaf7] p-3">
        <h2 className="mb-3 font-semibold">Add item</h2>
        <div className="mb-3 rounded-md border border-line bg-white p-2 text-sm text-muted">
          Product list uses vehicle stock available on the selected invoice date.
        </div>
        <div className="grid gap-3">
          <BarcodeScanInput
            submitOnEnter={false}
            submitOnScan={false}
            onValueChange={setScanCode}
            onCommit={selectByCode}
          />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_110px]">
            <Field label="Product">
              <Select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
                <option value="">Select product</option>
                {productChoices.map((row) => {
                  const available = row.balance - (usedByBatch.get(row.batchId) ?? 0);
                  return (
                    <option key={row.batchId} value={row.batchId}>
                      {row.productName} {row.measurement} - {row.supplierName} - exp {row.expiryLabel} - vehicle {available} - {row.priceLabel}
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min="1"
                max={selectedAvailable || undefined}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
              />
            </Field>
            <div className="flex items-end">
              <Button type="button" onClick={addItem} className="w-full" disabled={!selectedBatchId || quantity > selectedAvailable}>Add</Button>
            </div>
          </div>
        </div>

        {scanCode.trim() && scanMatches.length === 0 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            No available vehicle stock found for this barcode or item code.
          </div>
        ) : null}
        {scanMatches.length > 1 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            More than one batch matches this code. Select the correct expiry batch.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <h2 className="font-semibold">Invoice items</h2>
        {items.map((item, index) => (
          <div key={item.batchId}>
            <input type="hidden" name={`batch-${index}`} value={item.batchId} />
            <input type="hidden" name={`quantity-${index}`} value={item.quantity} />
          </div>
        ))}
        <Table headers={["Product", "Qty", "Unit price", "Line total", "Action"]}>
          {items.map((item) => {
            const row = stockRows.find((entry) => entry.batchId === item.batchId);
            const lineTotal = item.quantity * (row?.sellingPrice ?? 0);
            return (
              <tr key={item.batchId}>
                <td className="px-3 py-2">
                  <div className="font-medium">{row?.productName} {row?.measurement}</div>
                  <div className="text-xs text-muted">{row?.supplierName} - exp {row?.expiryLabel}</div>
                </td>
                <td className="px-3 py-2 tabular">{item.quantity}</td>
                <td className="px-3 py-2 tabular">{row?.priceLabel ?? "-"}</td>
                <td className="px-3 py-2 tabular">{lineTotal.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <ConfirmButton
                    type="button"
                    message="Remove this item from the invoice?"
                    confirmLabel="Remove"
                    className="h-8 w-8 px-0"
                    onConfirm={() => removeItem(item.batchId)}
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </ConfirmButton>
                </td>
              </tr>
            );
          })}
          <tr className="bg-[#ebe7dd] font-semibold">
            <td className="px-3 py-2" colSpan={3}>Total</td>
            <td className="px-3 py-2 tabular">{total.toFixed(2)}</td>
            <td className="px-3 py-2" />
          </tr>
        </Table>
      </div>

      {actionState.message ? (
        <div className={`rounded-md p-3 text-sm ${actionState.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {actionState.message}
        </div>
      ) : null}
      <Button type="submit" disabled={items.length === 0 || isPending}>
        {isPending ? "Saving..." : mode === "create" ? "Create invoice" : "Save invoice"}
      </Button>
    </form>
  );
}
