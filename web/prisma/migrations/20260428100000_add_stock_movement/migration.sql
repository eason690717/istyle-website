CREATE TABLE "StockMovement" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "productId" INTEGER,
  "productVariantId" INTEGER,
  "type" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "prevStock" INTEGER NOT NULL,
  "newStock" INTEGER NOT NULL,
  "unitCost" INTEGER,
  "saleId" INTEGER,
  "poNumber" TEXT,
  "supplier" TEXT,
  "reason" TEXT,
  "notes" TEXT,
  "staffId" INTEGER,
  "adminEmail" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_productVariantId_idx" ON "StockMovement"("productVariantId");
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
