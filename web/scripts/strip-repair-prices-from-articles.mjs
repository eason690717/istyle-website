// 把既有自動文章裡「寫死的維修報價」換成導向 /quote 的連結
// 原因：文章價格不會隨每日更新的報價系統變動，客人看到舊價到店會有爭議。
// 不刪文章（blog 是第二大流量來源），只改寫內文。
// 用法：node scripts/strip-repair-prices-from-articles.mjs [--apply]
import "dotenv/config";
import { createClient } from "@libsql/client";

const APPLY = process.argv.includes("--apply");
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 與 src/lib/auto-blog.ts 的 TROUBLE_TEMPLATES 對應
const NOTE_BY_ISSUE = {
  "螢幕破裂": "分「僅外玻璃碎」與「顯示／觸控異常」兩種，處理方式與費用不同，需現場判斷。",
  "電池老化": "健康度低於 80% 或已出現無預警關機，建議更換。",
  "充電孔氧化": "先嘗試清潔，確認接觸不良才需更換尾插排線。",
  "Face ID 失效": "多因前次維修拆裝造成，需檢測是排線或點陣投射器問題。",
  "聽筒沒聲音": "先排除軟體與喇叭網孔堵塞，再判斷是否需更換聽筒。",
};

function rewriteTrouble(body) {
  let out = body;
  // 1. 標題：常見故障與維修費用 → 常見故障與判斷方式
  out = out.replace(/^## (.+) 常見故障與維修費用$/m, "## $1 常見故障與判斷方式");

  // 2. 逐段把「**維修費用**：<價格>」換成該症狀的判斷說明
  //    先找出這一段屬於哪個症狀（往前找最近的 ### N. 症狀）
  const lines = out.split("\n");
  let currentIssue = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^### \d+\.\s*(.+?)\s*$/);
    if (h) currentIssue = h[1];
    if (/^\*\*維修費用\*\*：/.test(lines[i])) {
      const note = currentIssue && NOTE_BY_ISSUE[currentIssue];
      lines[i] = note
        ? `**判斷方式**：${note}`
        : "**維修報價**：[線上查詢即時報價](/quote)（每日更新）";
    }
  }
  out = lines.join("\n");

  // 3. 移除開頭「（目前回收價約 NT$ X）」這種會過期的插話
  out = out.replace(/（目前回收價約 NT\$ [\d,]+）/g, "");

  // 3b.「不修了？高價回收」段落裡也寫死了回收價，同樣會過期 → 改導 /recycle
  out = out.replace(
    /^(.+) 目前回收價 \*\*NT\$ [\d,]+\*\*(（[^）]*）)?，i時代每日比對市場行情，\*\*保證高於市場\*\*。$/m,
    "修不如換的時候，$1 也可以直接折現。i時代每日比對市場行情，**保證高於市場**，實際金額依機況現場核定。",
  );

  // 4. 在「為什麼選 i時代」前插入報價查詢區塊（若尚未有）
  if (!/查詢.*即時維修報價/.test(out)) {
    out = out.replace(
      /^## 為什麼選 i時代維修 (.+)？$/m,
      `## $1 維修要多少錢？\n\n各項目的維修費用會隨零件行情調整，站上報價每日自動更新，請直接查詢最新價格：\n\n[👉 查詢 $1 即時維修報價](/quote)\n\n不確定是哪個部位故障，可先用[免費自助診斷](/diagnose)初步判斷。\n\n## 為什麼選 i時代維修 $1？`,
    );
  }
  return out;
}

function rewriteBrandGuide(body) {
  // 把「## 熱門機型維修報價」下方那張含 $ 金額的表格整段換成導流文字
  return body.replace(
    /## 熱門機型維修報價\n\n\|[\s\S]*?\n\n(?=## )/,
    "## 維修報價查詢\n\n各機型、各項目的維修費用會隨零件行情調整，站上每日自動更新，請直接查詢即時報價：\n\n[👉 查看完整維修報價](/quote)\n\n",
  );
}

const rows = await db.execute(
  "SELECT id, slug, kind, body FROM AutoArticle WHERE kind IN ('trouble_article','brand_guide')",
);

let changed = 0, unchanged = 0;
const updates = [];
for (const r of rows.rows) {
  const before = r.body;
  const after = r.kind === "trouble_article" ? rewriteTrouble(before) : rewriteBrandGuide(before);
  if (after === before) { unchanged++; continue; }
  changed++;
  updates.push({ id: r.id, slug: r.slug, kind: r.kind, after });
}

console.log(`掃描 ${rows.rows.length} 篇：需改寫 ${changed}、無變化 ${unchanged}`);

// 改寫後仍殘留 $ 金額的，列出來人工確認
const stillHasPrice = updates.filter(u => /\$\s?[\d,]{3,}/.test(u.after));
console.log(`改寫後仍含 $ 金額的文章：${stillHasPrice.length}`);
for (const u of stillHasPrice.slice(0, 3)) {
  const hits = [...u.after.matchAll(/.{0,40}\$\s?[\d,]{3,}.{0,40}/g)].slice(0, 3).map(m => m[0].replace(/\n/g, " "));
  console.log(`  ${u.slug}:`);
  hits.forEach(h => console.log(`     …${h}…`));
}

if (updates[0]) {
  console.log(`\n--- 範例（${updates[0].slug}）改寫後前 900 字 ---`);
  console.log(updates[0].after.slice(0, 900));
}

if (!APPLY) {
  console.log("\n這是預覽。實際執行請加 --apply");
  process.exit(0);
}

let done = 0;
for (let i = 0; i < updates.length; i += 20) {
  await Promise.all(updates.slice(i, i + 20).map(u =>
    db.execute({ sql: "UPDATE AutoArticle SET body = ? WHERE id = ?", args: [u.after, u.id] })
      .then(() => { done++; })
      .catch(e => console.error(`失敗 ${u.slug}:`, e.message)),
  ));
}
console.log(`\n✅ 已改寫 ${done} 篇`);
