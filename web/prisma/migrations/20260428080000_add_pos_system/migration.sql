CREATE TABLE "StaffMember" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CASHIER',
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "StaffSession" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "staffId" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" DATETIME,
  CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id")
);
CREATE INDEX "StaffSession_staffId_idx" ON "StaffSession"("staffId");

CREATE TABLE "Sale" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "saleNumber" TEXT NOT NULL UNIQUE,
  "staffId" INTEGER NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "subtotal" INTEGER NOT NULL,
  "discount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
  "paidAt" DATETIME,
  "notes" TEXT,
  "repairTicketId" INTEGER,
  "invoiceNumber" TEXT,
  "invoiceIssuedAt" DATETIME,
  "voidedAt" DATETIME,
  "voidReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id")
);
CREATE INDEX "Sale_saleNumber_idx" ON "Sale"("saleNumber");
CREATE INDEX "Sale_staffId_idx" ON "Sale"("staffId");
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX "Sale_paymentStatus_idx" ON "Sale"("paymentStatus");

CREATE TABLE "SaleItem" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "saleId" INTEGER NOT NULL,
  "itemType" TEXT NOT NULL,
  "productId" INTEGER,
  "productVariantId" INTEGER,
  "repairPriceId" INTEGER,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  "notes" TEXT,
  CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE
);
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX "SaleItem_productVariantId_idx" ON "SaleItem"("productVariantId");
