-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "orderId" INTEGER,
    "ecpayTradeNo" TEXT,
    "ecpayMerchantTradeNo" TEXT,
    "paymentMethod" TEXT,
    "paidAt" DATETIME,
    "invoiceNumber" TEXT,
    "invoiceIssuedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_token_key" ON "PaymentLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_orderId_key" ON "PaymentLink"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_ecpayTradeNo_key" ON "PaymentLink"("ecpayTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_ecpayMerchantTradeNo_key" ON "PaymentLink"("ecpayMerchantTradeNo");

-- CreateIndex
CREATE INDEX "PaymentLink_status_idx" ON "PaymentLink"("status");

-- CreateIndex
CREATE INDEX "PaymentLink_createdAt_idx" ON "PaymentLink"("createdAt");
