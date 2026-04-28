import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }

const db = createClient({ url, authToken });

const { rows: total } = await db.execute("SELECT count(*) as c FROM AutoArticle");
console.log(`Total auto-articles: ${total[0].c}\n`);

const { rows: recent } = await db.execute(
  "SELECT slug, title, kind, publishedAt FROM AutoArticle ORDER BY publishedAt DESC LIMIT 15"
);
console.log("Most recent 15:");
recent.forEach(a => {
  const date = String(a.publishedAt).slice(0, 10);
  console.log(`  [${date}] [${a.kind || "?"}] ${a.title}`);
});

const { rows: byKind } = await db.execute(
  "SELECT kind, count(*) as c FROM AutoArticle GROUP BY kind"
);
console.log("\nBy kind:");
byKind.forEach(k => console.log(`  ${k.kind || "(null)"}: ${k.c}`));
