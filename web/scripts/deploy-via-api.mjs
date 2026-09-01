// 透過 Vercel REST API 部署 —— CLI 用 project-scoped token 會卡在 user 解析（404），
// 但同一個 token 對 REST API 有完整權限，所以改走 API：
//   1. 每個檔案算 SHA1 → POST /v2/files 上傳
//   2. POST /v13/deployments 帶檔案清單建立 production 部署
// 檔案清單用 `git ls-files` 取得，天然排除 node_modules / .next / .env
//
// 用法：node scripts/deploy-via-api.mjs <TOKEN>
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

const TOKEN = process.argv[2];
const PROJECT_ID = "prj_C8Kh4BSj09p2hRETfUOLMOMHJlvG";
if (!TOKEN) { console.error("用法: node scripts/deploy-via-api.mjs <TOKEN>"); process.exit(1); }

const H = { Authorization: `Bearer ${TOKEN}` };

const files = execSync("git ls-files", { encoding: "utf-8" })
  .split("\n").map(s => s.trim()).filter(Boolean)
  .filter(f => !f.startsWith(".claude/"));   // 本機開發設定，不需要部署

console.log(`準備上傳 ${files.length} 個檔案…`);

const manifest = [];
let uploaded = 0, skipped = 0, bytes = 0;

for (const f of files) {
  let buf;
  try { buf = readFileSync(f); } catch { continue; }
  const sha = createHash("sha1").update(buf).digest("hex");
  const size = statSync(f).size;
  manifest.push({ file: f, sha, size });
  bytes += size;

  const res = await fetch("https://api.vercel.com/v2/files", {
    method: "POST",
    headers: { ...H, "Content-Length": String(size), "x-vercel-digest": sha },
    body: buf,
  });
  if (res.ok) uploaded++;
  else if (res.status === 409) skipped++;          // 已存在，不必重傳
  else {
    const t = await res.text();
    console.error(`  上傳失敗 ${f}: HTTP ${res.status} ${t.slice(0, 160)}`);
  }
  if ((uploaded + skipped) % 60 === 0) console.log(`  進度 ${uploaded + skipped}/${files.length}`);
}
console.log(`上傳完成：新增 ${uploaded}、已存在 ${skipped}、共 ${(bytes / 1048576).toFixed(1)}MB`);

console.log("建立 production 部署…");
const dep = await fetch("https://api.vercel.com/v13/deployments?forceNew=1", {
  method: "POST",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "istyle",
    project: PROJECT_ID,
    target: "production",
    files: manifest,
    projectSettings: { framework: "nextjs" },
  }),
});
const body = await dep.json();
if (!dep.ok) {
  console.error(`❌ 建立部署失敗 HTTP ${dep.status}`);
  console.error(JSON.stringify(body?.error ?? body, null, 2).slice(0, 800));
  process.exit(1);
}
console.log(`✅ 部署已建立`);
console.log(`   id:  ${body.id}`);
console.log(`   url: https://${body.url}`);
console.log(`   狀態: ${body.readyState || body.status}`);
console.log(`\n建置中，可用這個查進度：`);
console.log(`   node scripts/deploy-status.mjs ${TOKEN} ${body.id}`);
