/*
  Warnings:

  - You are about to drop the column `tripId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ProductBatch` table. All the data in the column will be lost.
  - You are about to drop the `LoadingTrip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoadingTripItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `batchId` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costPrice` to the `ProductBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receivedQuantity` to the `ProductBatch` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('load', 'sale', 'return_to_warehouse', 'adjustment');

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_tripId_fkey";

-- DropForeignKey
ALTER TABLE "LoadingTrip" DROP CONSTRAINT "LoadingTrip_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "LoadingTrip" DROP CONSTRAINT "LoadingTrip_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "LoadingTripItem" DROP CONSTRAINT "LoadingTripItem_batchId_fkey";

-- DropForeignKey
ALTER TABLE "LoadingTripItem" DROP CONSTRAINT "LoadingTripItem_tripId_fkey";

-- DropIndex
DROP INDEX "Invoice_tripId_idx";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "tripId",
ADD COLUMN     "vehicleId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "batchId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "mrp" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ProductBatch" DROP COLUMN "quantity",
ADD COLUMN     "costPrice" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "receivedQuantity" INTEGER NOT NULL;

-- DropTable
DROP TABLE "LoadingTrip";

-- DropTable
DROP TABLE "LoadingTripItem";

-- DropEnum
DROP TYPE "TripStatus";

-- CreateTable
CREATE TABLE "VehicleLoad" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "loadDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLoadItem" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityLoaded" INTEGER NOT NULL,

    CONSTRAINT "VehicleLoadItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleReturn" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "returnDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityExpected" INTEGER NOT NULL,
    "quantityReturned" INTEGER NOT NULL,

    CONSTRAINT "VehicleReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStockLedger" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "transactionType" "StockTransactionType" NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "transactionDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadItemId" TEXT,
    "returnItemId" TEXT,
    "invoiceItemId" TEXT,

    CONSTRAINT "VehicleStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleLoad_vehicleId_loadDate_idx" ON "VehicleLoad"("vehicleId", "loadDate");

-- CreateIndex
CREATE INDEX "VehicleLoadItem_loadId_idx" ON "VehicleLoadItem"("loadId");

-- CreateIndex
CREATE INDEX "VehicleLoadItem_batchId_idx" ON "VehicleLoadItem"("batchId");

-- CreateIndex
CREATE INDEX "VehicleReturn_vehicleId_returnDate_idx" ON "VehicleReturn"("vehicleId", "returnDate");

-- CreateIndex
CREATE INDEX "VehicleReturnItem_returnId_idx" ON "VehicleReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "VehicleReturnItem_batchId_idx" ON "VehicleReturnItem"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStockLedger_loadItemId_key" ON "VehicleStockLedger"("loadItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStockLedger_returnItemId_key" ON "VehicleStockLedger"("returnItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStockLedger_invoiceItemId_key" ON "VehicleStockLedger"("invoiceItemId");

-- CreateIndex
CREATE INDEX "VehicleStockLedger_vehicleId_productId_transactionDate_idx" ON "VehicleStockLedger"("vehicleId", "productId", "transactionDate");

-- CreateIndex
CREATE INDEX "VehicleStockLedger_batchId_transactionDate_idx" ON "VehicleStockLedger"("batchId", "transactionDate");

-- CreateIndex
CREATE INDEX "Invoice_vehicleId_idx" ON "Invoice"("vehicleId");

-- AddForeignKey
ALTER TABLE "VehicleLoad" ADD CONSTRAINT "VehicleLoad_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLoadItem" ADD CONSTRAINT "VehicleLoadItem_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "VehicleLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLoadItem" ADD CONSTRAINT "VehicleLoadItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReturn" ADD CONSTRAINT "VehicleReturn_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReturnItem" ADD CONSTRAINT "VehicleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "VehicleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReturnItem" ADD CONSTRAINT "VehicleReturnItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_loadItemId_fkey" FOREIGN KEY ("loadItemId") REFERENCES "VehicleLoadItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_returnItemId_fkey" FOREIGN KEY ("returnItemId") REFERENCES "VehicleReturnItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStockLedger" ADD CONSTRAINT "VehicleStockLedger_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
