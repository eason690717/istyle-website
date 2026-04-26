// 修正非 ASCII slug：Next.js dynamic route 不穩
import { createClient } from "@libsql/client";
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }

const db = createClient({ url, authToken });

const r = await db.execute("SELECT id, slug, name FROM Product");
const bad = r.rows.filter(row => /[^\x00-\x7F]/.test(String(row.slug)));
console.log(`Total products: ${r.rows.length}, with non-ASCII slug: ${bad.length}`);

for (const row of bad) {
  const oldSlug = String(row.slug);
  const newSlug = `p-${row.id}`;
  console.log(`  id=${row.id}: "${row.name}" "${oldSlug}" → "${newSlug}"`);
  await db.execute({
    sql: "UPDATE Product SET slug = ? WHERE id = ?",
    args: [newSlug, Number(row.id)],
  });
}
console.log("Done.");
