"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { BarcodeScanInput } from "@/components/BarcodeScanInput";
import { ConfirmButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, Select, Table } from "@/components/ui";
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions";

type ShopOption = {
  id: string;
  name: string;
};

type TripOption = {
  id: string;
  label: string;
  tripDate: string;
  productIds: string[];
};

type ProductOption = {
  id: string;
  name: string;
  measurement: string;
  supplierName: string;
  barcode: string | null;
  itemCode: string | null;
  sellingPrice: number;
  priceLabel: string;
};

type InvoiceItemDraft = {
  productId: string;
  quantity: number;
};

export function InvoiceBuilderForm({
  mode,
  invoiceId,
  shops,
  trips,
  products,
  defaultShopId = "",
  defaultTripId = "",
  defaultInvoiceDate,
  initialItems = []
}: {
  mode: "create" | "edit";
  invoiceId?: string;
  shops: ShopOption[];
  trips: TripOption[];
  products: ProductOption[];
  defaultShopId?: string;
  defaultTripId?: string;
  defaultInvoiceDate: string;
  initialItems?: InvoiceItemDraft[];
}) {
  const [scanCode, setScanCode] = useState("");
  const [tripId, setTripId] = useState(defaultTripId);
  const [invoiceDate, setInvoiceDate] = useState(defaultInvoiceDate);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<InvoiceItemDraft[]>(initialItems);

  const selectedTrip = trips.find((trip) => trip.id === tripId);
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  const baseProducts = useMemo(() => {
    if (!selectedTrip) return [];
    const tripProductIds = new Set(selectedTrip.productIds);
    return products.filter((product) => tripProductIds.has(product.id));
  }, [products, selectedTrip]);

  const scanMatches = useMemo(() => {
    const code = scanCode.trim().toLowerCase();
    if (!code) return [];
    return baseProducts.filter(
      (product) =>
        product.barcode?.toLowerCase() === code ||
        product.itemCode?.toLowerCase() === code
    );
  }, [baseProducts, scanCode]);

  const productChoices = useMemo(() => {
    if (!scanCode.trim()) return baseProducts;
    return scanMatches;
  }, [baseProducts, scanCode, scanMatches]);

  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + item.quantity * (product?.sellingPrice ?? 0);
  }, 0);

  function selectProductByCode(nextValue: string) {
    const code = nextValue.trim().toLowerCase();
    if (!code) return;

    const exactMatches = baseProducts.filter(
      (product) =>
        product.barcode?.toLowerCase() === code ||
        product.itemCode?.toLowerCase() === code
    );

    if (exactMatches.length === 1) {
      setSelectedProductId(exactMatches[0].id);
    } else {
      setSelectedProductId("");
    }
  }

  function handleScan(nextValue: string) {
    setScanCode(nextValue);
    selectProductByCode(nextValue);
  }

  function handleTripChange(nextTripId: string) {
    const nextTrip = trips.find((trip) => trip.id === nextTripId);
    setTripId(nextTripId);
    setSelectedProductId("");
    setScanCode("");
    if (nextTrip) {
      setInvoiceDate(nextTrip.tripDate);
    }
  }

  function addItem() {
    if (!selectedProductId || quantity <= 0) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === selectedProductId);
      if (existing) {
        return current.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...current, { productId: selectedProductId, quantity }];
    });

    setSelectedProductId("");
    setScanCode("");
    setQuantity(1);
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  return (
    <form action={mode === "create" ? createInvoiceAction : updateInvoiceAction} className="grid gap-5">
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Shop">
          <Select name="shopId" defaultValue={defaultShopId} required>
            <option value="">Select shop</option>
            {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </Select>
        </Field>
        <Field label="Linked trip">
          <Select name="tripId" value={tripId} onChange={(event) => handleTripChange(event.target.value)} required>
            <option value="">Select trip</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.label}</option>)}
          </Select>
        </Field>
        <Field label="Invoice date">
          <Input
            name="invoiceDate"
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            required
          />
        </Field>
      </div>

      <div className="rounded-md border border-line bg-[#fbfaf7] p-3">
        <h2 className="mb-3 font-semibold">Add item</h2>
        {!selectedTrip ? (
          <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Select a linked trip before adding invoice items.
          </div>
        ) : null}
        <div className="grid gap-3">
          <BarcodeScanInput
            submitOnEnter={false}
            submitOnScan={false}
            onValueChange={handleScan}
            onCommit={selectProductByCode}
          />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_110px]">
            <Field label="Product">
              <Select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
                <option value="">Select product</option>
                {productChoices.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.measurement} - {product.supplierName} - {product.priceLabel}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min="1"
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
              <Button type="button" onClick={addItem} className="w-full" disabled={!selectedTrip}>Add</Button>
            </div>
          </div>
        </div>

        {scanCode.trim() && scanMatches.length === 0 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            No product found for this barcode or item code.
          </div>
        ) : null}
        {scanMatches.length > 1 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Multiple products match this code. Select the correct product.
          </div>
        ) : null}
        {selectedTrip && !scanCode.trim() && productChoices.length === 0 ? (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            This linked trip has no loaded products.
          </div>
        ) : null}
        {selectedProduct ? (
          <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            Selected: {selectedProduct.name} {selectedProduct.measurement} - {selectedProduct.supplierName}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <h2 className="font-semibold">Invoice items</h2>
        {items.map((item, index) => (
          <div key={item.productId}>
            <input type="hidden" name={`product-${index}`} value={item.productId} />
            <input type="hidden" name={`quantity-${index}`} value={item.quantity} />
          </div>
        ))}
        <Table headers={["Product", "Qty", "Unit price", "Line total", "Action"]}>
          {items.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            const lineTotal = item.quantity * (product?.sellingPrice ?? 0);
            return (
              <tr key={item.productId}>
                <td className="px-3 py-2">
                  <div className="font-medium">{product?.name} {product?.measurement}</div>
                  <div className="text-xs text-muted">{product?.supplierName}</div>
                </td>
                <td className="px-3 py-2 tabular">{item.quantity}</td>
                <td className="px-3 py-2 tabular">{product?.priceLabel ?? "-"}</td>
                <td className="px-3 py-2 tabular">{lineTotal.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <ConfirmButton
                    type="button"
                    message="Remove this item from the invoice?"
                    confirmLabel="Remove"
                    className="h-8 w-8 px-0"
                    onConfirm={() => removeItem(item.productId)}
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
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white p-4 text-sm text-muted">
            No invoice items added yet.
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={!selectedTrip || items.length === 0}>{mode === "create" ? "Create invoice" : "Save invoice"}</Button>
    </form>
  );
}
