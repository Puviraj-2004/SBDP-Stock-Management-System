import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional().transform((value) => value || null)
);
const dateText = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);
const money = z.coerce.number().positive();

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
  sellingPrice: money
});

export const batchSchema = z.object({
  productId: z.string().min(1),
  quantity: nonNegativeInt,
  expiryDate: dateText,
  receivedDate: dateText
});

export const tripSchema = z.object({
  vehicleId: z.string().min(1),
  supplierId: optionalText,
  tripDate: dateText
});

export const tripItemSchema = z.object({
  tripId: z.string().min(1),
  batchId: z.string().min(1),
  quantityLoaded: positiveInt
});

export const closeTripSchema = z.object({
  tripId: z.string().min(1),
  returns: z.array(
    z.object({
      itemId: z.string().min(1),
      quantityReturned: z.coerce.number().int().min(0)
    })
  )
});

export const invoiceSchema = z.object({
  shopId: z.string().min(1),
  tripId: z.string().min(1),
  invoiceDate: dateText,
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: positiveInt
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
  if (value.method === "cheque" && !value.chequeNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["chequeNumber"],
      message: "Cheque number is required for cheque payments"
    });
  }
});
