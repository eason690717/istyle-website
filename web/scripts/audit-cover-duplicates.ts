// 用「圖片內容 SHA-256」稽核所有文章封面是否重複，並可自動修復。
//
// 為什麼要比內容而不是比網址／檔名：
// 舊的抓圖腳本每個查詢都取 Pexels 第一筆結果，相似查詢會拿到同一張照片，
// 存成 5 個不同檔名 → 檔名全都不一樣，但列表頁看起來是同一張圖。
//
// 用法：
//   npx tsx scripts/audit-cover-duplicates.ts            # 只稽核
//   npx tsx scripts/audit-cover-duplicates.ts --apply    # 稽核並修復重複
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { pickUniqueCover } from "../src/lib/article-cover";
import { BLOG_POSTS } from "../src/lib/blog-posts";

const APPLY = process.argv.includes("--apply");
const MAP_FILE = resolve(process.cwd(), "src", "lib", "pexels-covers.json");

type Entry = { kind: "auto" | "manual"; id: number | null; slug: string; title: string; cover: string };

const hashCache = new Map<string, string>();

async function hashCover(cover: string): Promise<string | null> {
  if (hashCache.has(cover)) return hashCache.get(cover)!;
  let buf: Buffer | null = null;
  try {
    if (cover.startsWith("http")) {
      const res = await fetch(cover);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      const p = resolve(process.cwd(), "public", cover.replace(/^\//, ""));
      if (!existsSync(p)) return null;
      buf = readFileSync(p);
    }
  } catch { return null; }
  const h = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  hashCache.set(cover, h);
  return h;
}

async function main() {
  const autos = await prisma.autoArticle.findMany({
    select: { id: true, slug: true, title: true, coverImage: true },
    orderBy: { publishedAt: "desc" },
  });
  const map: Record<string, string> = JSON.parse(readFileSync(MAP_FILE, "utf-8"));

  const entries: Entry[] = [
    ...autos.map(a => ({ kind: "auto" as const, id: a.id, slug: a.slug, title: a.title, cover: a.coverImage || "" })),
    ...BLOG_POSTS.map(p => ({ kind: "manual" as const, id: null, slug: p.slug, title: p.title, cover: map[p.slug] || p.coverImage })),
  ].filter(e => e.cover);

  console.log(`稽核 ${entries.length} 篇（自動 ${autos.length}／手寫 ${BLOG_POSTS.length}）…`);

  const byHash = new Map<string, Entry[]>();
  let done = 0, failed = 0;
  for (const e of entries) {
    const h = await hashCover(e.cover);
    done++;
    if (done % 50 === 0) console.log(`  已處理 ${done}/${entries.length}`);
    if (!h) { failed++; continue; }
    (byHash.get(h) ?? byHash.set(h, []).get(h)!).push(e);
  }

  const dups = [...byHash.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n不重複內容 ${byHash.size} 種 / 可讀取 ${entries.length - failed} 篇（${failed} 篇讀取失敗）`);
  if (dups.length === 0) { console.log("✅ 沒有任何內容重複的封面"); return; }

  console.log(`\n❌ 發現 ${dups.length} 組內容重複，共 ${dups.reduce((s, [, v]) => s + v.length - 1, 0)} 篇需換圖：`);
  for (const [h, v] of dups.slice(0, 8)) {
    console.log(`  hash ${h} ×${v.length}`);
    for (const e of v) console.log(`     [${e.kind}] ${e.slug}`);
  }

  if (!APPLY) { console.log("\n這是稽核。修復請加 --apply"); return; }

  // 每組保留第一篇，其餘重新取一張「內容也不重複」的圖
  const usedUrls = new Set(entries.map(e => e.cover));
  const usedHashes = new Set(byHash.keys());
  const fixes: Array<{ e: Entry; cover: string }> = [];

  for (const [, group] of dups) {
    for (const e of group.slice(1)) {
      let chosen: string | null = null;
      for (let attempt = 0; attempt < 8 && !chosen; attempt++) {
        const cand = await pickUniqueCover([e.slug, e.title, String(attempt)], usedUrls);
        const ch = await hashCover(cand);
        if (ch && !usedHashes.has(ch)) { usedHashes.add(ch); chosen = cand; }
      }
      if (chosen) fixes.push({ e, cover: chosen });
      else console.warn(`  ⚠️ ${e.slug} 找不到內容不重複的替代圖`);
    }
  }

  console.log(`\n準備更新 ${fixes.length} 篇`);
  let ok = 0;
  for (const f of fixes) {
    if (f.e.kind === "auto") {
      await prisma.autoArticle.update({ where: { id: f.e.id! }, data: { coverImage: f.cover } })
        .then(() => { ok++; }).catch(err => console.error(`失敗 ${f.e.slug}`, String(err).slice(0, 100)));
    } else {
      map[f.e.slug] = f.cover;   // 手寫文章走 pexels-covers.json 映射
      ok++;
    }
  }
  writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + "\n", "utf-8");
  console.log(`✅ 已更新 ${ok} 篇（手寫文章寫入 pexels-covers.json）`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
