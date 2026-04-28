import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });
const sql = readFileSync("prisma/migrations/20260428100000_add_stock_movement/migration.sql", "utf-8");
console.log("Applying StockMovement migration to Turso...");
await db.executeMultiple(sql);
console.log("Done. ", (await db.execute("SELECT count(*) as c FROM StockMovement")).rows[0].c, "movements");
