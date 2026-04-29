import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260429030000_add_serial_tracking/migration.sql", "utf-8");
console.log("Applying serial migration...");
await db.executeMultiple(sql);
console.log("Done");
