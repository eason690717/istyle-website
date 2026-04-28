ALTER TABLE "RepairPrice" ADD COLUMN "overrideReason" TEXT;
ALTER TABLE "RepairPrice" ADD COLUMN "overriddenAt" DATETIME;
ALTER TABLE "RepairPrice" ADD COLUMN "overriddenBy" TEXT;
