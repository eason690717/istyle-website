// 查詢 Vercel 部署狀態，直到 READY 或 ERROR
// 用法：node scripts/deploy-status.mjs <TOKEN> <DEPLOYMENT_ID>
const [TOKEN, ID] = process.argv.slice(2);
if (!TOKEN || !ID) { console.error("用法: node scripts/deploy-status.mjs <TOKEN> <DEPLOYMENT_ID>"); process.exit(1); }
const H = { Authorization: `Bearer ${TOKEN}` };

for (let i = 0; i < 60; i++) {
  const r = await fetch(`https://api.vercel.com/v13/deployments/${ID}`, { headers: H });
  const d = await r.json();
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
