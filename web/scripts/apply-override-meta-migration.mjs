import "dotenv/config";
import { createClient } from "@libsql/client";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
console.log("Adding price override meta columns...");
await db.execute('ALTER TABLE "RepairPrice" ADD COLUMN "overrideReason" TEXT');
await db.execute('ALTER TABLE "RepairPrice" ADD COLUMN "overriddenAt" DATETIME');
await db.execute('ALTER TABLE "RepairPrice" ADD COLUMN "overriddenBy" TEXT');
console.log("Done");
