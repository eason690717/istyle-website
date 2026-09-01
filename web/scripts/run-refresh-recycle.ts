// 本機執行二手回收爬蟲，驗證三來源修復後的實際寫入結果
// 用法：npx tsx scripts/run-refresh-recycle.ts
import "dotenv/config";
import { refreshRecyclePrices } from "../src/lib/recycle/aggregate";

async function main() {
  const t0 = Date.now();
  const r = await refreshRecyclePrices();
  console.log("\n===== 結果 =====");
  console.log(JSON.stringify(r, null, 2));
  console.log(`\n總耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s（Vercel maxDuration=300s）`);
  if (!r.ok) { console.log("\n⚠️ 有來源異常，cron 會回 207 並通知老闆"); }
}
main().catch(e => { console.error(e); process.exit(1); });
