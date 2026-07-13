"use client";

import { forwardRef } from "react";
import { useMemo, useState } from "react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Button, Field, Input, Select } from "@/components/ui";
import { receiveBatchAction } from "@/lib/actions";

export type ProductOption = {
  id: string;
  name: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
};

export const BatchReceiveForm = forwardRef<HTMLFormElement, {
  products: ProductOption[];
  today: string;
  defaultProductId?: string;
  action?: (formData: FormData) => void | Promise<void>;
  saving?: boolean;
  error?: string;
  hideActions?: boolean;
}>(function BatchReceiveForm({
  products,
  today,
  defaultProductId = "",
  action = receiveBatchAction,
  saving = false,
  error = "",
  hideActions = false
}, ref) {
  const [scanCode, setScanCode] = useState("");
  const [productId, setProductId] = useState(defaultProductId);
  const matches = useMemo(() => {
    const code = scanCode.trim().toLowerCase();
    if (!code) return [];
    return products.filter(
      (product) =>
        product.barcode?.toLowerCase() === code ||
        product.itemCode?.toLowerCase() === code
    );
  }, [products, scanCode]);

  function selectProductByCode(nextValue: string) {
    const code = nextValue.trim().toLowerCase();
    if (!code) return;

    const exactMatches = products.filter(
      (product) =>
        product.barcode?.toLowerCase() === code ||
        product.itemCode?.toLowerCase() === code
    );

    if (exactMatches.length === 1) {
      setProductId(exactMatches[0].id);
    }
  }

  function handleScan(nextValue: string) {
    setScanCode(nextValue);
    selectProductByCode(nextValue);
  }

  return (
    <form ref={ref} action={action} className="grid gap-3">
      <BarcodeScanInput
        submitOnEnter={false}
        submitOnScan={false}
        onValueChange={handleScan}
        onCommit={selectProductByCode}
      />

      {scanCode.trim() && matches.length === 0 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          No product found for this barcode or item code. Add the product first, then receive stock.
        </div>
      ) : null}

      {matches.length > 1 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Multiple products match this code. Select the correct product from the dropdown.
        </div>
      ) : null}

      <Field label="Product">
        <Select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} required>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} {product.measurement} - {product.supplierName}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Received quantity"><Input name="receivedQuantity" type="number" min="1" required /></Field>
        <Field label="Cost price"><Input name="costPrice" type="number" min="0" step="0.01" required /></Field>
        <Field label="Received date">
          <DatePickerInput name="receivedDate" defaultValue={today} required />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Expiry date">
          <DatePickerInput name="expiryDate" required />
        </Field>
      </div>
      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {hideActions ? null : <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Receive batch"}</Button>}
    </form>
  );
});
