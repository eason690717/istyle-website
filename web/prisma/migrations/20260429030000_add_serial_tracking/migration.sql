ALTER TABLE "Product" ADD COLUMN "tracksSerial" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "serial" TEXT;
CREATE INDEX "SaleItem_serial_idx" ON "SaleItem"("serial");

CREATE TABLE "ProductSerial" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "productId" INTEGER NOT NULL,
  "productVariantId" INTEGER,
  "serial" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
  "cost" INTEGER,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "soldAt" DATETIME,
  "saleId" INTEGER,
  "saleItemId" INTEGER,
  "notes" TEXT,
  "receivedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ProductSerial_productId_serial_key" ON "ProductSerial"("productId", "serial");
CREATE INDEX "ProductSerial_serial_idx" ON "ProductSerial"("serial");
CREATE INDEX "ProductSerial_status_productId_idx" ON "ProductSerial"("status", "productId");
CREATE INDEX "ProductSerial_saleId_idx" ON "ProductSerial"("saleId");
