import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260507120000_add_cerphone_scrape_log/migration.sql", "utf-8");
console.log("Applying cerphone scrape log migration...");
await db.executeMultiple(sql);
console.log("Done");
