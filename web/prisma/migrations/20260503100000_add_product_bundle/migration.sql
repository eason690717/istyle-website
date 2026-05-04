CREATE TABLE "ProductBundle" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "items" TEXT NOT NULL,
  "imageUrl" TEXT,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "ProductBundle_isActive_sortOrder_idx" ON "ProductBundle"("isActive", "sortOrder");
