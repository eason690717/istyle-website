// 用 Pexels API 為所有部落格文章抓取真實主題圖片
// - 從文章 title 推出英文關鍵字
// - 搜 Pexels → 取第一張 → 下載到 public/cases/pexels-<slug>.jpg
// - 更新 AutoArticle.coverImage（手動文章在 BLOG_POSTS 用映射檔處理）

import { createClient } from "@libsql/client";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!PEXELS_KEY || !TURSO_URL || !TURSO_TOKEN) {
  console.error("Set PEXELS_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN");
  process.exit(1);
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const OUT_DIR = resolve(process.cwd(), "public", "cases");
const MAP_FILE = resolve(process.cwd(), "src", "lib", "pexels-covers.json"); // 給 BLOG_POSTS 用
mkdirSync(OUT_DIR, { recursive: true });

// 中文標題 → 英文 Pexels 搜尋關鍵字
const KEYWORD_RULES = [
  { match: /電池|膨脹|續航|健康度/i, query: "phone battery repair" },
  { match: /過熱|發燙|降頻/i,         query: "smartphone overheating" },
  { match: /綠屏|綠色波紋|綠線|花屏/i, query: "broken phone screen green" },
  { match: /觸控失靈|無反應/i,         query: "broken phone touch screen" },
  { match: /macbook\s*pro/i,         query: "macbook pro repair" },
  { match: /macbook\s*air/i,         query: "macbook air laptop" },
  { match: /macbook|筆電/i,            query: "macbook keyboard repair" },
  { match: /ipad\s*pro/i,            query: "ipad pro screen" },
  { match: /ipad/i,                  query: "ipad tablet apple" },
  { match: /switch|nintendo/i,       query: "nintendo switch console" },
  { match: /joy.?con|搖桿|磨菇頭/i,    query: "nintendo switch controller" },
  { match: /dyson|吸塵器/i,            query: "dyson vacuum cleaner" },
  { match: /face\s*id|人臉/i,          query: "iphone face id" },
  { match: /主機板|機板|焊接|cpu/i,    query: "smartphone motherboard soldering" },
  { match: /拆機|零件|工具/i,           query: "phone disassembly tools" },
  { match: /回收|二手|收購|trade/i,    query: "used iphone collection" },
  { match: /iphone\s*1[6789]\s*pro\s*max/i, query: "iphone pro max black" },
  { match: /iphone\s*pro/i,          query: "iphone pro" },
  { match: /iphone/i,                query: "iphone repair" },
  { match: /samsung\s*galaxy|三星/i,   query: "samsung galaxy phone" },
  { match: /板橋|江子翠|門市|推薦/i,    query: "phone repair shop interior" },
  { match: /螢幕|玻璃|破裂|液晶/i,     query: "cracked phone screen" },
  { match: /apple|蘋果/i,              query: "apple iphone gold" },
];

function pickQuery(title) {
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(title)) return rule.query;
  }
  return "phone repair workbench";
}

async function searchPexels(query, orientation = "landscape") {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=3&size=large`;
  const r = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const data = await r.json();
  return data.photos || [];
}

async function downloadPhoto(photo, outName) {
  const url = photo.src.large || photo.src.original;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const out = resolve(OUT_DIR, outName);
  writeFileSync(out, buf);
  return out;
}

const allMap = {}; // slug -> /cases/pexels-xxx.jpg
let ok = 0, fail = 0;

// 1. 自動產生的文章
const auto = await turso.execute("SELECT id, slug, title FROM AutoArticle");
console.log(`[1/2] AutoArticle: ${auto.rows.length} articles`);
for (const a of auto.rows) {
  const fileName = `pexels-${a.slug}.jpg`;
  const targetPath = `/cases/${fileName}`;
  const localPath = resolve(OUT_DIR, fileName);
  if (existsSync(localPath)) {
    await turso.execute({ sql: "UPDATE AutoArticle SET coverImage = ? WHERE id = ?", args: [targetPath, a.id] });
    console.log(`  cached ${a.slug.slice(0, 50)}`);
    allMap[a.slug] = targetPath;
    ok++;
    continue;
  }
  const query = pickQuery(a.title);
  try {
    const photos = await searchPexels(query);
    if (photos.length === 0) throw new Error("no results");
    await downloadPhoto(photos[0], fileName);
    await turso.execute({ sql: "UPDATE AutoArticle SET coverImage = ? WHERE id = ?", args: [targetPath, a.id] });
    console.log(`  ✓ ${a.slug.slice(0, 50)} → "${query}"`);
    allMap[a.slug] = targetPath;
    ok++;
  } catch (e) {
    console.error(`  ✗ ${a.slug}: ${e.message}`);
    fail++;
  }
  await new Promise(r => setTimeout(r, 300));
}

// 2. 手動文章 BLOG_POSTS — 從 src 讀 slugs + title
console.log("\n[2/2] Manual blog posts");
const blogTs = readFileSync(resolve(process.cwd(), "src", "lib", "blog-posts.ts"), "utf-8");
const slugMatches = [...blogTs.matchAll(/slug:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)];
console.log(`  found ${slugMatches.length} manual posts`);
for (const [, slug, title] of slugMatches) {
  const fileName = `pexels-${slug}.jpg`;
  const targetPath = `/cases/${fileName}`;
  const localPath = resolve(OUT_DIR, fileName);
  if (existsSync(localPath)) {
    allMap[slug] = targetPath;
    ok++;
    continue;
  }
  const query = pickQuery(title);
  try {
    const photos = await searchPexels(query);
    if (photos.length === 0) throw new Error("no results");
    await downloadPhoto(photos[0], fileName);
    console.log(`  ✓ ${slug} → "${query}"`);
    allMap[slug] = targetPath;
    ok++;
  } catch (e) {
    console.error(`  ✗ ${slug}: ${e.message}`);
    fail++;
  }
  await new Promise(r => setTimeout(r, 300));
}

// 寫 mapping JSON 給 BLOG_POSTS 用
writeFileSync(MAP_FILE, JSON.stringify(allMap, null, 2));
console.log(`\n[done] ${ok} ok, ${fail} fail. Map saved to src/lib/pexels-covers.json`);
