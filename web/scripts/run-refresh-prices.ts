// 本機執行維修報價爬蟲（cerphone），驗證能在 timeout 內跑完全部資料
// 用法：npx tsx scripts/run-refresh-prices.ts
import "dotenv/config";
import { scrapeCerphoneAll } from "../src/lib/cerphone/scraper";

async function main() {
  const t0 = Date.now();
  const r = await scrapeCerphoneAll();
  console.log("\n===== 結果 =====");
  console.log(JSON.stringify(r, null, 2));
  console.log(`\n總耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s（Vercel maxDuration=300s）`);
}
main().catch(e => { console.error(e); process.exit(1); });
