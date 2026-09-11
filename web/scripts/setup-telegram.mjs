// Telegram 通知一鍵設定：驗證 bot → 自動取得 chat_id → 發測試訊息 → 寫入 Vercel 環境變數
//
// 事前準備（約 2 分鐘）：
//   1. Telegram 搜尋 @BotFather → 傳 /newbot → 照指示取名 → 拿到 bot token
//   2. 對你剛建立的 bot 傳一則 /start（讓 bot 知道要傳給誰）
//   3. 在 web/.env.local 加一行：TELEGRAM_BOT_TOKEN=你的token
//      （.env.local 被 .gitignore 擋住，也不會被部署上傳；token 不需要貼進任何對話）
//
// 用法：node scripts/setup-telegram.mjs
import { existsSync, readFileSync } from "node:fs";

function readLocalEnv(key) {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf-8").split("\n").find(l => l.trim().startsWith(key + "="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "") : undefined;
}

const BOT = readLocalEnv("TELEGRAM_BOT_TOKEN") || process.env.TELEGRAM_BOT_TOKEN?.trim();
const VERCEL = readLocalEnv("VERCEL_DEPLOY_TOKEN") || process.env.VERCEL_DEPLOY_TOKEN?.trim();
const PROJECT_ID = "prj_C8Kh4BSj09p2hRETfUOLMOMHJlvG";

if (!BOT) {
  console.error("❌ 找不到 TELEGRAM_BOT_TOKEN。請在 web/.env.local 加一行 TELEGRAM_BOT_TOKEN=xxx（見檔頭說明）");
  process.exit(1);
}

const tg = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (!d.ok) throw new Error(`${method}: ${d.description || res.status}`);
  return d.result;
};

// 1. 驗證 token
const me = await tg("getMe");
console.log(`✅ Bot 有效：@${me.username}（${me.first_name}）`);

// 2. 取得 chat_id（找最近一則私訊）
let chatId = readLocalEnv("TELEGRAM_CHAT_ID");
if (!chatId) {
  const updates = await tg("getUpdates");
  const msg = [...updates].reverse().map(u => u.message || u.edited_message).find(m => m?.chat?.type === "private");
  if (!msg) {
    console.error(`❌ 還沒收到你的訊息。請在 Telegram 對 @${me.username} 傳一則 /start，再重跑一次這支腳本。`);
    process.exit(1);
  }
  chatId = String(msg.chat.id);
  console.log(`✅ 取得 chat_id：${chatId}（${msg.chat.first_name || ""} @${msg.chat.username || "-"}）`);
}

// 3. 發測試訊息
await tg("sendMessage", {
  chat_id: chatId,
  text: "✅ i時代官網通知已接通\n\n之後以下事件會傳到這裡：\n・客人線上預約\n・結帳下單、綠界付款成功\n・出貨\n・庫存不足\n・報價爬蟲異常",
});
console.log("✅ 測試訊息已送出，請看一下 Telegram");

// 4. 寫入 Vercel 環境變數（需 web/.env.local 的 VERCEL_DEPLOY_TOKEN）
if (!VERCEL) {
  console.log(`\n⚠️ 沒有 VERCEL_DEPLOY_TOKEN，請手動到 Vercel → istyle → Settings → Environment Variables 新增：`);
  console.log(`   TELEGRAM_BOT_TOKEN = （你的 bot token）`);
  console.log(`   TELEGRAM_CHAT_ID   = ${chatId}`);
  process.exit(0);
}
let envOk = true;
for (const [key, value] of [["TELEGRAM_BOT_TOKEN", BOT], ["TELEGRAM_CHAT_ID", chatId]]) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${VERCEL}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview"] }),
  });
  if (res.ok) console.log(`✅ Vercel 環境變數 ${key} 已寫入`);
  else { envOk = false; console.error(`❌ 寫入 ${key} 失敗：HTTP ${res.status} ${(await res.text()).slice(0, 150)}`); }
}
if (envOk) console.log(`\n下一步：重新部署讓環境變數生效 → node scripts/deploy-via-api.mjs`);
else console.log(`\n請改手動到 Vercel 後台新增 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID=${chatId}`);
