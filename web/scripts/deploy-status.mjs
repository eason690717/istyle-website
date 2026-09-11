// 查詢 Vercel 部署狀態，直到 READY 或 ERROR
// 用法：node scripts/deploy-status.mjs <DEPLOYMENT_ID>           （token 讀自 web/.env.local）
//      node scripts/deploy-status.mjs <TOKEN> <DEPLOYMENT_ID>
import { existsSync, readFileSync as readEnvFile } from "node:fs";

// Token 來源優先序：命令列參數 → web/.env.local 的 VERCEL_DEPLOY_TOKEN → 環境變數。
// 放在 .env.local（被 .gitignore 的 .env* 擋住、也不在 git ls-files 內所以不會被上傳），
// 就不必每次把 token 貼進對話或指令歷史。
function loadDeployToken() {
  if (process.argv[2] && !process.argv[2].startsWith("dpl_")) return process.argv[2];
  if (existsSync(".env.local")) {
    const line = readEnvFile(".env.local", "utf-8").split("\n")
      .find(l => l.trim().startsWith("VERCEL_DEPLOY_TOKEN"));
    // trim() 會一併去掉 Windows 換行的 \r；再剝掉可能的引號
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
  }
  return process.env.VERCEL_DEPLOY_TOKEN?.trim();
}
const args = process.argv.slice(2);
const ID = args.find(a => a.startsWith("dpl_"));
const TOKEN = args.length >= 2 ? args[0] : loadDeployToken();
if (!TOKEN || !ID) { console.error("用法: node scripts/deploy-status.mjs <DEPLOYMENT_ID>（token 放 web/.env.local 的 VERCEL_DEPLOY_TOKEN）"); process.exit(1); }
const H = { Authorization: `Bearer ${TOKEN}` };

for (let i = 0; i < 60; i++) {
  const r = await fetch(`https://api.vercel.com/v13/deployments/${ID}`, { headers: H });
  const d = await r.json();
  // token 無效或部署不存在時 API 回 error 物件，不能當成「還在建置」繼續空轉 10 分鐘
  if (!r.ok || d.error) {
    console.error(`❌ 查詢失敗（HTTP ${r.status}）：${d.error?.message || "未知錯誤"}`);
    process.exit(1);
  }
  const state = d.readyState || d.status;
  console.log(`[${new Date().toLocaleTimeString("zh-TW")}] ${state}`);
  if (state === "READY") {
    console.log(`\n✅ 部署完成`);
    console.log(`   url: https://${d.url}`);
    for (const a of d.alias || []) console.log(`   alias: https://${a}`);
    process.exit(0);
  }
  if (state === "ERROR" || state === "CANCELED") {
    console.error(`\n❌ 部署失敗：${d.errorMessage || state}`);
    const logs = await fetch(`https://api.vercel.com/v2/deployments/${ID}/events?limit=40`, { headers: H });
    const ev = await logs.json();
    for (const e of (Array.isArray(ev) ? ev : ev.events || []).slice(-25)) {
      const t = e.payload?.text || e.text;
      if (t) console.error("   " + String(t).replace(/\n/g, "\n   "));
    }
    process.exit(1);
  }
  await new Promise(s => setTimeout(s, 10000));
}
console.error("逾時：超過 10 分鐘仍未完成");
process.exit(1);
