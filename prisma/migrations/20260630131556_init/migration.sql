-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('loaded', 'closed');

-- CreateEnum
CREATE TYPE "PaidStatus" AS ENUM ('unpaid', 'partial', 'paid');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('pending', 'cleared');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "measurement" TEXT NOT NULL,
    "barcode" TEXT,
    "itemCode" TEXT,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiryDate" DATE NOT NULL,
    "receivedDate" DATE NOT NULL,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "nameOrNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingTrip" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "supplierId" TEXT,
    "tripDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TripStatus" NOT NULL DEFAULT 'loaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "LoadingTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingTripItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityLoaded" INTEGER NOT NULL,
    "quantityReturned" INTEGER,

    CONSTRAINT "LoadingTripItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tripId" TEXT,
    "invoiceDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidStatus" "PaidStatus" NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "chequeNumber" TEXT,
    "chequeStatus" "ChequeStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_barcode_supplierId_idx" ON "Product"("barcode", "supplierId");

-- CreateIndex
CREATE INDEX "Product_itemCode_supplierId_idx" ON "Product"("itemCode", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_measurement_supplierId_key" ON "Product"("name", "measurement", "supplierId");

-- CreateIndex
CREATE INDEX "ProductBatch_productId_expiryDate_idx" ON "ProductBatch"("productId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_nameOrNumber_key" ON "Vehicle"("nameOrNumber");

-- CreateIndex
CREATE INDEX "LoadingTrip_tripDate_status_idx" ON "LoadingTrip"("tripDate", "status");

-- CreateIndex
CREATE INDEX "LoadingTripItem_tripId_idx" ON "LoadingTripItem"("tripId");

-- CreateIndex
CREATE INDEX "LoadingTripItem_batchId_idx" ON "LoadingTripItem"("batchId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_invoiceDate_idx" ON "Invoice"("shopId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_tripId_idx" ON "Invoice"("tripId");

-- CreateIndex
CREATE INDEX "Payment_shopId_paymentDate_idx" ON "Payment"("shopId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_username_key" ON "Owner"("username");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingTrip" ADD CONSTRAINT "LoadingTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingTrip" ADD CONSTRAINT "LoadingTrip_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingTripItem" ADD CONSTRAINT "LoadingTripItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "LoadingTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingTripItem" ADD CONSTRAINT "LoadingTripItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "LoadingTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
