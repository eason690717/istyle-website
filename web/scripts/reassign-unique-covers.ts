// 為既有自動文章重新指派「互不重複」的封面圖
// 背景：舊的 pickCover 只有 11 張本地圖要分給 285 篇，單張被用了 74 次，
// 列表頁看起來像同一篇文章重複貼。改用 Pexels 遠端圖（已在 CSP / next.config 白名單）。
// 用法：npx tsx scripts/reassign-unique-covers.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { pickUniqueCover } from "../src/lib/article-cover";

const APPLY = process.argv.includes("--apply");

async function main() {
  const articles = await prisma.autoArticle.findMany({
    select: { id: true, slug: true, kind: true, title: true, coverImage: true },
    orderBy: { publishedAt: "desc" },
  });
  console.log(`文章總數：${articles.length}`);
  console.log(`目前不重複封面：${new Set(articles.map(a => a.coverImage)).size}`);

  if (!process.env.PEXELS_API_KEY?.trim()) {
    console.error("缺少 PEXELS_API_KEY，無法取得足量圖片。中止。");
    process.exit(1);
  }

  // 從空集合開始重新分配，讓每篇都拿到獨一無二的圖
  const used = new Set<string>();
  const assignments: Array<{ id: number; slug: string; cover: string }> = [];

  for (const a of articles) {
    const cover = await pickUniqueCover([a.slug, a.title, a.kind], used);
    assignments.push({ id: a.id, slug: a.slug, cover });
    if (assignments.length % 50 === 0) {
      console.log(`  已配 ${assignments.length}/${articles.length}…（不重複 ${used.size}）`);
    }
  }

  const distinct = new Set(assignments.map(a => a.cover)).size;
  console.log(`\n配置完成：${assignments.length} 篇 → ${distinct} 張不重複封面`);
  if (distinct < assignments.length) {
    console.log(`⚠️ 有 ${assignments.length - distinct} 篇拿到重複圖（圖源不足，已盡量分散）`);
  }
  console.log("抽樣：");
  for (const a of assignments.slice(0, 5)) console.log(`  ${a.slug}\n    → ${a.cover}`);

  if (!APPLY) { console.log("\n這是預覽。實際執行請加 --apply"); return; }

  let done = 0;
  for (let i = 0; i < assignments.length; i += 20) {
    await Promise.all(assignments.slice(i, i + 20).map(a =>
      prisma.autoArticle.update({ where: { id: a.id }, data: { coverImage: a.cover } })
        .then(() => { done++; })
        .catch(e => console.error(`失敗 ${a.slug}:`, String(e).slice(0, 120))),
    ));
  }
  console.log(`\n✅ 已更新 ${done} 篇封面`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
