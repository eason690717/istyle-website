// 清理既有的重複自動文章（2026-10-21：445 篇中約 397 篇重複）
//
//   npx tsx scripts/dedupe-auto-articles.ts            預覽
//   npx tsx scripts/dedupe-auto-articles.ts --apply    執行（會先完整備份到 ../backups/）
//
// 規則：
//   - 故障文章：每個機型留一篇，內文用新產生器重寫（舊內文彼此只差機型名，留著仍是重複）
//   - 回收週報：每個 ISO 週留最後一天那篇；內文（去日期後）與已保留的相同就不留
//   - 保養文章：每個題目留最早那篇
//   - 品牌指南：每個品牌留最新那篇，並移除表格中已下架的機型
//   - 每月報告：全部停用（每月只差幾個統計數字）
//   - 每個被刪或改名的舊網址都寫進轉址表，網站以 308 永久轉址到保留的那篇
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { contentFingerprint } from "../src/lib/article-uniqueness";
import { findModelCtx, buildTroubleArticle } from "../src/lib/trouble-article";
import { isoWeek } from "../src/lib/auto-blog";

const APPLY = process.argv.includes("--apply");

type Row = Awaited<ReturnType<typeof load>>[number];
async function load() {
  return prisma.autoArticle.findMany({ orderBy: { publishedAt: "asc" } });
}

interface Keep { id: number; slug: string; title: string; excerpt: string; body: string;
  metaDescription: string | null; keywords: string | null; subject: string | null }

async function main() {
  const rows = await load();
  const keeps = new Map<number, Keep>();          // id → 保留後的最終內容
  const del = new Set<number>();
  const redirect: Record<string, string> = {};    // 舊 slug → 新路徑
  const log: string[] = [];
  const byKind = (k: string) => rows.filter(r => r.kind === k);
  const asKeep = (r: Row): Keep => ({ id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt, body: r.body,
    metaDescription: r.metaDescription, keywords: r.keywords, subject: r.subject });

  // ── 故障文章 ──
  const trouble = new Map<string, Row[]>();
  for (const r of byKind("trouble_article")) {
    const m = r.title.match(/^(.+?) 常見故障維修指南｜(.+?) 5 大問題解析$/);
    const key = m ? `${m[2]}|${m[1]}` : `?|${r.slug}`;
    trouble.set(key, [...(trouble.get(key) || []), r]);
  }
  const newSlugOwner = new Map<string, number>();
  for (const [key, group] of trouble) {
    const [brand, model] = key.split("|");
    // 舊文章機型名來自回收價資料，少數寫法和維修資料庫不同
    const ALIAS: Record<string, string> = { "Samsung|S26 Ultra": "S26U（S9480)" };
    const ctx = brand === "?" ? null : await findModelCtx(brand, ALIAS[key] ?? model);
    if (!ctx) {
      group.forEach(r => { del.add(r.id); redirect[r.slug] = "/blog"; });
      log.push(`故障 ${model}：找不到對應機型，${group.length} 篇停用 → /blog`);
      continue;
    }
    const a = buildTroubleArticle(ctx);
    const owner = newSlugOwner.get(a.slug);
    if (owner !== undefined) {                     // 兩種舊寫法對到同一個機型，併入先保留的那篇
      group.forEach(r => { del.add(r.id); redirect[r.slug] = `/blog/auto/${a.slug}`; });
      continue;
    }
    const [first, ...rest] = group;
    newSlugOwner.set(a.slug, first.id);
    keeps.set(first.id, { id: first.id, slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body,
      metaDescription: a.metaDescription, keywords: a.keywords, subject: a.subject });
    if (first.slug !== a.slug) redirect[first.slug] = `/blog/auto/${a.slug}`;
    rest.forEach(r => { del.add(r.id); redirect[r.slug] = `/blog/auto/${a.slug}`; });
    if (group.length > 1) log.push(`故障 ${ctx.name}：${group.length} 篇 → 1 篇（內文重寫）`);
  }

  // ── 回收週報 ──
  const weeks = new Map<string, Row[]>();
  for (const r of byKind("weekly_recycle")) {
    const w = isoWeek(new Date(r.publishedAt)).label;
    weeks.set(w, [...(weeks.get(w) || []), r]);
  }
  const keptWeeklyFp = new Map<string, string>();
  for (const [label, group] of [...weeks.entries()].sort()) {
    const last = group[group.length - 1];
    const fp = contentFingerprint(last.body);
    const target = `weekly-recycle-${label}`;
    const dupOf = keptWeeklyFp.get(fp);
    if (dupOf) {                                   // 跟之前某週一模一樣（行情沒變），整週併到那週
      group.forEach(r => { del.add(r.id); redirect[r.slug] = `/blog/auto/${dupOf}`; });
      continue;
    }
    keptWeeklyFp.set(fp, target);
    const [y, wk] = label.split("-w");
    keeps.set(last.id, { ...asKeep(last), slug: target,
      title: `${y} 第 ${Number(wk)} 週 二手 3C 回收行情總覽`,
      excerpt: last.excerpt.replace(/^本週/, `${y} 第 ${Number(wk)} 週`) });
    group.forEach(r => { if (r.id !== last.id) del.add(r.id); if (r.slug !== target) redirect[r.slug] = `/blog/auto/${target}`; });
  }
  log.push(`回收週報：${byKind("weekly_recycle").length} 篇 → ${keptWeeklyFp.size} 篇（每週一篇，行情相同的週合併）`);

  // ── 保養文章 ──
  const care = new Map<string, Row[]>();
  for (const r of byKind("care_tips")) {
    const key = r.slug.replace(/^care-/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
    care.set(key, [...(care.get(key) || []), r]);
  }
  for (const [key, group] of care) {
    const [first, ...rest] = group;
    const target = `care-${key}`;
    keeps.set(first.id, { ...asKeep(first), slug: target });
    if (first.slug !== target) redirect[first.slug] = `/blog/auto/${target}`;
    rest.forEach(r => { del.add(r.id); redirect[r.slug] = `/blog/auto/${target}`; });
  }
  log.push(`保養文章：${byKind("care_tips").length} 篇 → ${care.size} 篇`);

  // ── 品牌指南 ──
  const inactive = new Set((await prisma.deviceModel.findMany({ where: { isActive: false }, select: { name: true } })).map(m => m.name));
  const brands = new Map<string, Row[]>();
  for (const r of byKind("brand_guide")) {
    const b = r.slug.replace(/^brand-guide-/, "").replace(/-\d{4}-\d{2}$/, "");
    brands.set(b, [...(brands.get(b) || []), r]);
  }
  for (const [b, group] of brands) {
    const latest = group[group.length - 1];
    const target = `brand-guide-${b}`;
    const body = latest.body.split("\n").filter(line => {
      const cell = line.match(/^\|\s*([^|]+?)\s*\|/)?.[1];
      return !(cell && inactive.has(cell));              // 拿掉已下架機型（例如 Watch／AirPods）
    }).join("\n").replace(/（\d{4}-\d{2} 更新）/, "");
    keeps.set(latest.id, { ...asKeep(latest), slug: target, body });
    group.forEach(r => { if (r.id !== latest.id) del.add(r.id); if (r.slug !== target) redirect[r.slug] = `/blog/auto/${target}`; });
  }
  log.push(`品牌指南：${byKind("brand_guide").length} 篇 → ${brands.size} 篇`);

  // ── 每月報告 ──
  for (const r of byKind("monthly_summary")) { del.add(r.id); redirect[r.slug] = "/quote"; }
  log.push(`每月報告：${byKind("monthly_summary").length} 篇全部停用 → /quote`);

  // 其他類型（例如今天新寫的知識文章）原樣保留
  for (const r of rows) if (!keeps.has(r.id) && !del.has(r.id)) keeps.set(r.id, asKeep(r));

  // ── 最終驗證：保留的文章之間標題、內文指紋都不可重複 ──
  const finalRows = [...keeps.values()];
  const fps = new Map<string, string>(), titles = new Map<string, string>(), slugs = new Set<string>();
  const problems: string[] = [];
  for (const k of finalRows) {
    const fp = contentFingerprint(k.body, k.subject);
    if (fps.has(fp)) problems.push(`內文重複：${k.slug} ↔ ${fps.get(fp)}`); else fps.set(fp, k.slug);
    if (titles.has(k.title)) problems.push(`標題重複：${k.title}`); else titles.set(k.title, k.slug);
    if (slugs.has(k.slug)) problems.push(`網址重複：${k.slug}`); slugs.add(k.slug);
  }
  // 轉址目標必須真的存在
  const kept = new Set(finalRows.map(k => `/blog/auto/${k.slug}`));
  const badTargets = Object.entries(redirect).filter(([, to]) => to.startsWith("/blog/auto/") && !kept.has(to));
  badTargets.forEach(([from, to]) => problems.push(`轉址目標不存在：${from} → ${to}`));

  console.log(log.join("\n"));
  console.log(`\n總計：${rows.length} 篇 → 保留 ${finalRows.length} 篇，刪除 ${del.size} 篇，轉址 ${Object.keys(redirect).length} 筆`);
  console.log(`驗證：${problems.length ? "❌\n  " + problems.slice(0, 10).join("\n  ") : "✅ 保留的文章標題、內文、網址全部不重複；轉址目標都存在"}`);
  if (problems.length) process.exit(1);
  if (!APPLY) { console.log("\n這是預覽。執行請加 --apply"); return; }

  // ── 執行 ──
  const backupDir = resolve(process.cwd(), "..", "backups");
  mkdirSync(backupDir, { recursive: true });
  const backupFile = resolve(backupDir, `auto-articles-before-dedupe-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(backupFile, JSON.stringify(rows, null, 1));
  console.log(`\n已備份 ${rows.length} 篇 → ${backupFile}`);

  // 先刪，再改名（避免改名時撞到稍後才刪的舊 slug）；改名分兩段避開 slug 唯一索引互撞
  const delIds = [...del];
  for (let i = 0; i < delIds.length; i += 200) {
    await prisma.autoArticle.deleteMany({ where: { id: { in: delIds.slice(i, i + 200) } } });
  }
  for (const k of finalRows) await prisma.autoArticle.update({ where: { id: k.id }, data: { slug: `tmp-${k.id}` } });
  for (const k of finalRows) {
    await prisma.autoArticle.update({ where: { id: k.id }, data: {
      slug: k.slug, title: k.title, excerpt: k.excerpt, body: k.body,
      metaDescription: k.metaDescription, keywords: k.keywords, subject: k.subject,
      contentHash: contentFingerprint(k.body, k.subject),
    } });
  }
  const mapFile = resolve(process.cwd(), "src", "lib", "legacy-article-redirects.json");
  writeFileSync(mapFile, JSON.stringify(redirect, null, 1) + "\n");
  console.log(`✅ 刪除 ${delIds.length} 篇、更新 ${finalRows.length} 篇；轉址表 ${Object.keys(redirect).length} 筆 → src/lib/legacy-article-redirects.json`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
