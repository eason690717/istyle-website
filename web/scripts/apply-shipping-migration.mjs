import "dotenv/config";
import { createClient } from "@libsql/client";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
console.log("Adding shipping columns to PaymentLink...");
await db.execute('ALTER TABLE "PaymentLink" ADD COLUMN "shippingProvider" TEXT');
await db.execute('ALTER TABLE "PaymentLink" ADD COLUMN "trackingNumber" TEXT');
await db.execute('ALTER TABLE "PaymentLink" ADD COLUMN "shippingNote" TEXT');
await db.execute('ALTER TABLE "PaymentLink" ADD COLUMN "shippedAt" DATETIME');
console.log("Done");
