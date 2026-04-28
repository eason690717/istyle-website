import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260428080000_add_pos_system/migration.sql", "utf-8");
console.log("Applying POS migration to Turso...");
await db.executeMultiple(sql);
console.log("Tables: ", (await db.execute("SELECT count(*) as c FROM StaffMember")).rows[0].c, "staff");
