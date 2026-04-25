// 一次性 setup：把 Prisma migrations + seed 灌到 Turso
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

const client = createClient({ url, authToken });

console.log("[1/2] Drop existing tables (clean slate)...");
const existing = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
);
for (const r of existing.rows) {
  await client.execute(`DROP TABLE IF EXISTS "${r.name}"`);
  console.log(`  dropped ${r.name}`);
}

console.log("\n[2/2] Apply migrations...");
const migrationsDir = resolve(process.cwd(), "prisma/migrations");
const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

for (const dir of dirs) {
  const sqlPath = join(migrationsDir, dir, "migration.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  // 用 executeMultiple — libsql 支援一次跑多句 SQL
  try {
    await client.executeMultiple(sql);
    console.log(`  ✓ ${dir}`);
  } catch (e) {
    console.error(`  ✗ ${dir}: ${String(e).slice(0, 200)}`);
  }
}

const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
console.log(`\n[done] Tables (${tables.rows.length}):`);
for (const r of tables.rows) console.log(`  - ${r.name}`);
