type InvoiceLine = { lineTotal: unknown };

type InvoiceWithLines<T extends InvoiceLine> = {
  totalAmount: unknown;
  items: T[];
};

function toCents(value: unknown) {
  return Math.round(Number(value ?? 0) * 100);
}

/** Splits an invoice-level discount across its item revenues without rounding drift. */
export function getInvoiceItemRevenues<T extends InvoiceLine>(invoice: InvoiceWithLines<T>) {
  const subtotalCents = invoice.items.reduce((sum, item) => sum + toCents(item.lineTotal), 0);
  const totalCents = Math.max(0, toCents(invoice.totalAmount));
  if (subtotalCents <= 0) return invoice.items.map((item) => ({ item, revenue: 0 }));

  let allocatedCents = 0;
  return invoice.items.map((item, index) => {
    const lineCents = toCents(item.lineTotal);
    const revenueCents = index === invoice.items.length - 1
      ? totalCents - allocatedCents
      : Math.round((lineCents / subtotalCents) * totalCents);
    allocatedCents += revenueCents;
    return { item, revenue: revenueCents / 100 };
  });
}
