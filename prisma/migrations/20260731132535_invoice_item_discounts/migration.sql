-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('none', 'amount', 'percentage');

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "discountType" "DiscountType" NOT NULL DEFAULT 'none',
ADD COLUMN     "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
