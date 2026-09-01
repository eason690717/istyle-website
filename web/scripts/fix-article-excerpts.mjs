// 清掉文章「摘要」裡的具體金額 —— 內文已處理過，但列表頁顯示的是 excerpt，
// 上面還留著「維修費用解析。回收價 NT$ 20,400」這類會過期的數字。
// 用法：node scripts/fix-article-excerpts.mjs [--apply]
import "dotenv/config";
import { createClient } from "@libsql/client";

const APPLY = process.argv.includes("--apply");
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function fixExcerpt(text) {
  let s = text;
  // 「。回收價 NT$ 20,400。」「回收價 NT$ 20,400」→ 整句移除
  s = s.replace(/[。，,]?\s*回收價\s*NT\$\s?[\d,]+\s*[。．]?/g, "。");
  // 「，最高回收 NT$ 37,800。」→ 整段拿掉（後面通常已有「完整 Top 10…」的描述）
  s = s.replace(/[，,]?\s*最高回收\s*NT\$\s?[\d,]+\s*[。．]?/g, "。");
  // 剩餘的裸金額（排除 LINE 折 $100 這種促銷）
  s = s.replace(/NT\$\s?[\d,]{4,}/g, "");
  // 維修「費用」解析 → 判斷方式
  s = s.replace(/與維修費用解析/g, "的成因與判斷方式");
  s = s.replace(/維修費用解析/g, "成因與判斷方式解析");
  // 收尾：重複標點與多餘空白
  s = s.replace(/。{2,}/g, "。").replace(/\s{2,}/g, " ").replace(/[，,]\s*。/g, "。").trim();
  return s;
}

const rows = await db.execute(
  "SELECT id, slug, excerpt FROM AutoArticle WHERE excerpt LIKE '%NT$%' OR excerpt LIKE '%維修費用%'",
);
console.log(`需處理：${rows.rows.length} 篇`);

const updates = [];
for (const r of rows.rows) {
  const after = fixExcerpt(r.excerpt);
  if (after !== r.excerpt) updates.push({ id: r.id, slug: r.slug, before: r.excerpt, after });
}
console.log(`實際會變更：${updates.length} 篇\n`);
for (const u of updates.slice(0, 4)) {
  console.log(`  ${u.slug}`);
  console.log(`    前：${u.before}`);
  console.log(`    後：${u.after}\n`);
}

if (!APPLY) { console.log("這是預覽。實際執行請加 --apply"); process.exit(0); }

let done = 0;
for (let i = 0; i < updates.length; i += 20) {
  await Promise.all(updates.slice(i, i + 20).map(u =>
    db.execute({ sql: "UPDATE AutoArticle SET excerpt = ? WHERE id = ?", args: [u.after, u.id] })
      .then(() => { done++; })
      .catch(e => console.error(`失敗 ${u.slug}:`, e.message)),
  ));
}
console.log(`✅ 已更新 ${done} 篇摘要`);
