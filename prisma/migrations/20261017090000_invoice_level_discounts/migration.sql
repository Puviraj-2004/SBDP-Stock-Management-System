ALTER TABLE "Invoice"
ADD COLUMN "invoiceDiscountType" "DiscountType" NOT NULL DEFAULT 'none',
ADD COLUMN "invoiceDiscountValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
