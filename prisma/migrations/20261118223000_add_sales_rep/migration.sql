-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRep_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "repId" TEXT;

-- CreateIndex
CREATE INDEX "SalesRep_supplierId_idx" ON "SalesRep"("supplierId");

-- CreateIndex
CREATE INDEX "Product_repId_idx" ON "Product"("repId");

-- AddForeignKey
ALTER TABLE "SalesRep" ADD CONSTRAINT "SalesRep_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_repId_fkey" FOREIGN KEY ("repId") REFERENCES "SalesRep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
