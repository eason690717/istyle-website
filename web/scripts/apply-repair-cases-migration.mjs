// 一次性：套用 RepairTicket + CaseStudy 表到 Turso
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }

const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260427120000_add_repair_cases/migration.sql", "utf-8");
console.log("Applying repair+cases migration to Turso...");
await db.executeMultiple(sql);
console.log("Done. Verify:");
const r1 = await db.execute("SELECT count(*) as c FROM RepairTicket");
const r2 = await db.execute("SELECT count(*) as c FROM CaseStudy");
console.log(`  RepairTicket: ${r1.rows[0].c} rows`);
console.log(`  CaseStudy: ${r2.rows[0].c} rows`);
