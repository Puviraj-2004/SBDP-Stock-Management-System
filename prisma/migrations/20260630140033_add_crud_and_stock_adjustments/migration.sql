-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('damage', 'expired', 'lost', 'correction');

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "reason" "StockAdjustmentReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAdjustment_batchId_createdAt_idx" ON "StockAdjustment"("batchId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
