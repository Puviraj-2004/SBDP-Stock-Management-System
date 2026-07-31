import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional().transform((value) => value || null)
);
const dateText = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);
const money = z.coerce.number().positive();
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().positive().nullable()
);

function todayInputValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function addFutureDateIssue(ctx: z.RefinementCtx, path: string[], label: string) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message: `${label} cannot be in the future`
  });
}

export const supplierSchema = z.object({
  name: z.string().trim().min(1),
  contactInfo: optionalText
});

export const vehicleSchema = z.object({
  nameOrNumber: z.string().trim().min(1)
});

export const shopSchema = z.object({
  name: z.string().trim().min(1),
  address: optionalText,
  contactNumber: optionalText
});

export const productSchema = z.object({
  supplierId: z.string().min(1),
  name: z.string().trim().min(1),
  measurement: z.string().trim().min(1),
  barcode: optionalText,
  itemCode: optionalText,
  sellingPrice: money,
  mrp: optionalMoney
});

export const batchSchema = z.object({
  productId: z.string().min(1),
  receivedQuantity: positiveInt,
  costPrice: money,
  expiryDate: dateText,
  receivedDate: dateText
}).superRefine((value, ctx) => {
  if (new Date(value.expiryDate) <= new Date(value.receivedDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date must be after received date"
    });
  }
});

export const vehicleLoadSchema = z.object({
  vehicleId: z.string().min(1),
  loadDate: dateText,
  batchId: z.string().min(1),
  quantityLoaded: positiveInt
}).superRefine((value, ctx) => {
  if (value.loadDate > todayInputValue()) {
    addFutureDateIssue(ctx, ["loadDate"], "Load date");
  }
});

export const invoiceSchema = z.object({
  shopId: z.string().min(1),
  vehicleId: z.string().min(1),
  invoiceDate: dateText,
  items: z.array(
    z.object({
      batchId: z.string().min(1),
      quantity: positiveInt,
      discountType: z.enum(["none", "amount", "percentage"]).default("none"),
      discountValue: z.coerce.number().min(0).default(0)
    })
  ).min(1)
}).superRefine((value, ctx) => {
  if (value.invoiceDate > todayInputValue()) {
    addFutureDateIssue(ctx, ["invoiceDate"], "Invoice date");
  }
});

export const vehicleReturnSchema = z.object({
  vehicleId: z.string().min(1),
  returnDate: dateText,
  notes: optionalText,
  items: z.array(
    z.object({
      batchId: z.string().min(1),
      quantityReturned: positiveInt
    })
  ).min(1)
});

export const openingInvoiceSchema = z.object({
  shopId: z.string().min(1),
  invoiceDate: dateText,
  referenceNumber: optionalText,
  notes: optionalText,
  totalAmount: money,
  alreadyPaidAmount: z.coerce.number().min(0).optional().default(0)
}).superRefine((value, ctx) => {
  if (value.invoiceDate > todayInputValue()) {
    addFutureDateIssue(ctx, ["invoiceDate"], "Invoice date");
  }
  if (value.alreadyPaidAmount >= value.totalAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["alreadyPaidAmount"],
      message: "Already paid amount must be less than the old invoice amount"
    });
  }
});

export const paymentSchema = z.object({
  shopId: z.string().min(1),
  invoiceId: optionalText,
  paymentDate: dateText,
  amount: money,
  method: z.enum(["cash", "bank_transfer", "cheque"]),
  chequeNumber: optionalText,
  chequeStatus: z.enum(["pending", "cleared"]).nullable().optional(),
  notes: optionalText
}).superRefine((value, ctx) => {
  if (value.paymentDate > todayInputValue()) {
    addFutureDateIssue(ctx, ["paymentDate"], "Payment date");
  }
  if (value.method === "cheque" && !value.chequeNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["chequeNumber"],
      message: "Cheque number is required for cheque payments"
    });
  }
});
