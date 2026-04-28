// 一次性：套用 analytics migration 到 Turso
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }

const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260426104500_add_analytics/migration.sql", "utf-8");
console.log("Applying analytics migration to Turso...");
await db.executeMultiple(sql);
console.log("Done. Verify:");
const r1 = await db.execute("SELECT count(*) as c FROM PageView");
const r2 = await db.execute("SELECT count(*) as c FROM AnalyticsEvent");
console.log(`  PageView: ${r1.rows[0].c} rows`);
console.log(`  AnalyticsEvent: ${r2.rows[0].c} rows`);
