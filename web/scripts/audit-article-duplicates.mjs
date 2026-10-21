import "dotenv/config";
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const rows = (await db.execute("SELECT id, slug, kind, title, body, coverImage, publishedAt FROM AutoArticle ORDER BY publishedAt")).rows;
const h = s => createHash("sha1").update(s || "").digest("hex");
// 內文比對前先去掉日期，避免「只差日期」被當成不同內容
const norm = b => (b || "").replace(/\d{4}-\d{2}-\d{2}/g, "").replace(/\d{4}-\d{2}/g, "");
const group = (key) => { const m = new Map(); for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) || []), r]); } return [...m.values()].filter(g => g.length > 1); };
const byTitle = group(r => r.title.replace(/\d{4}-\d{2}-\d{2}/, ""));
const byBody = group(r => h(norm(r.body)));
const byCover = group(r => r.coverImage);
console.log(`文章總數 ${rows.length}`);
console.log(`同標題（去日期）重複組 ${byTitle.length}，多出 ${byTitle.reduce((s,g)=>s+g.length-1,0)} 篇`);
console.log(`同內文（去日期）重複組 ${byBody.length}，多出 ${byBody.reduce((s,g)=>s+g.length-1,0)} 篇`);
console.log(`同封面重複組 ${byCover.length}`);
const k = {}; rows.forEach(r => k[r.kind] = (k[r.kind] || 0) + 1); console.log("類型分布", k);
console.log("\n重複最多的標題：");
byTitle.sort((a,b)=>b.length-a.length).slice(0, 12).forEach(g => console.log(`  ×${String(g.length).padStart(3)}  [${g[0].kind}] ${g[0].title.slice(0,40)}`));
// 模板相似度：故障文章扣掉機型名後內文是否一樣
const tr = rows.filter(r => r.kind === "trouble_article");
const tmpl = new Set(tr.map(r => h(norm(r.body).split(r.title.split(" 常見")[0]).join("{M}"))));
console.log(`\n故障文章 ${tr.length} 篇，扣掉機型名後只有 ${tmpl.size} 種內文`);
