// 重新匹配既有 AutoArticle 的封面圖（使用新的 keyword-based picker）
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }

const client = createClient({ url, authToken });

const TOPIC_COVERS = [
  { keywords: /電池|膨脹|續航|健康度|過熱|發燙|降頻/i, covers: ["/cases/iphone-battery.jpg", "/cases/soldering.jpg"] },
  { keywords: /綠屏|綠色波紋|綠線|顯示異常|花屏|觸控失靈/i, covers: ["/cases/iphone-broken-screen.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /macbook|筆電|筆記型電腦|mac\s*air|mac\s*pro/i, covers: ["/cases/macbook-repair.jpg", "/cases/soldering.jpg"] },
  { keywords: /ipad|平板/i, covers: ["/cases/ipad-repair.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /switch|遊戲主機|joy.?con|磨菇頭|nintendo/i, covers: ["/cases/switch-controller.jpg"] },
  { keywords: /dyson|吸塵器|吹風機/i, covers: ["/cases/dyson-vacuum.jpg"] },
  { keywords: /回收|賣|二手|trade.?in|收購/i, covers: ["/cases/phone-repair-bench.jpg", "/cases/iphone-disassembly.jpg"] },
  { keywords: /板橋|江子翠|門市|實體店|推薦/i, covers: ["/cases/tech-shop.jpg", "/cases/phone-repair-bench.jpg"] },
  { keywords: /主機板|機板|cpu|焊接|資料救援|拆機|零件/i, covers: ["/cases/soldering.jpg", "/cases/iphone-disassembly.jpg"] },
  { keywords: /螢幕|玻璃|破裂|碎裂|液晶|顯示/i, covers: ["/cases/iphone-broken-screen.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /iphone|蘋果手機/i, covers: ["/cases/iphone-disassembly.jpg", "/cases/iphone-battery.jpg", "/cases/iphone-broken-screen.jpg"] },
  { keywords: /samsung|三星/i, covers: ["/cases/phone-repair-bench.jpg", "/cases/screen-replacement.jpg"] },
];
const FALLBACK = ["/cases/phone-repair-bench.jpg", "/cases/tech-shop.jpg"];

function pickCover(slug, ...ctx) {
  const haystack = [slug, ...ctx].join(" ").toLowerCase();
  for (const t of TOPIC_COVERS) {
    if (t.keywords.test(haystack)) {
      let h = 0;
      for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return t.covers[h % t.covers.length];
    }
  }
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

const articles = await client.execute("SELECT id, slug, title, kind, coverImage FROM AutoArticle");
console.log(`[refresh] ${articles.rows.length} articles`);

let updated = 0;
for (const a of articles.rows) {
  const newCover = pickCover(a.slug, a.title);
  if (newCover !== a.coverImage) {
    await client.execute({
      sql: "UPDATE AutoArticle SET coverImage = ? WHERE id = ?",
      args: [newCover, a.id],
    });
    console.log(`  ${a.slug.slice(0, 50)} → ${newCover.split("/").pop()}`);
    updated++;
  }
}
console.log(`\n[done] updated ${updated} / ${articles.rows.length}`);
