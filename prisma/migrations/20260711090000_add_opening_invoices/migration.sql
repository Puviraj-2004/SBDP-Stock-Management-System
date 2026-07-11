CREATE TYPE "InvoiceType" AS ENUM ('sale', 'opening');

ALTER TABLE "Invoice"
ADD COLUMN "invoiceType" "InvoiceType" NOT NULL DEFAULT 'sale',
ADD COLUMN "referenceNumber" TEXT,
ADD COLUMN "notes" TEXT;

CREATE INDEX "Invoice_invoiceType_idx" ON "Invoice"("invoiceType");
