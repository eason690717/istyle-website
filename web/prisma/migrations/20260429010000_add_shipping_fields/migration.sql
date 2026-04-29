ALTER TABLE "PaymentLink" ADD COLUMN "shippingProvider" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN "shippingNote" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN "shippedAt" DATETIME;
