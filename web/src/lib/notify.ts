// 老闆通知 —— 預約、下單、付款成功、出貨、庫存不足、爬蟲異常都走這裡。
//
// 管道（任一設定即生效，可同時多個）：
//   1. Telegram：TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   ← 建議，設定最簡單
//   2. LINE Messaging API：LINE_CHANNEL_ACCESS_TOKEN + LINE_OWNER_USER_ID
//      （LINE Notify 已於 2025/03/31 停止服務）
//   3. 通用 webhook：NOTIFY_WEBHOOK_URL（Discord / Slack 格式）
//
// 2026-09-11 前三個管道都沒設定，所有通知只進 console —— 客人付款成功、下單、預約，
// 老闆一律收不到。沒有任何管道時現在會大聲警告，不再靜默。

export type NotifyResult = { delivered: string[]; failed: string[] };

// Vercel 後台貼上的值常夾帶換行，token 多一個字元整個管道就死，一律 trim
const env = (k: string) => process.env[k]?.trim() || "";

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export async function notifyOwner(message: string): Promise<NotifyResult> {
  console.log("[NOTIFY]", message);
  const delivered: string[] = [];
  const failed: string[] = [];

  const tasks: Array<[string, () => Promise<void>]> = [];

  const tgToken = env("TELEGRAM_BOT_TOKEN");
  const tgChat = env("TELEGRAM_CHAT_ID");
  if (tgToken && tgChat) {
    tasks.push(["telegram", () => post(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      chat_id: tgChat,
      text: message.slice(0, 4096),          // Telegram 單則上限
      disable_web_page_preview: true,
    })]);
  }

  const lineToken = env("LINE_CHANNEL_ACCESS_TOKEN");
  const lineUser = env("LINE_OWNER_USER_ID");
  if (lineToken && lineUser) {
    tasks.push(["line", () => post("https://api.line.me/v2/bot/message/push", {
      to: lineUser,
      messages: [{ type: "text", text: message.slice(0, 5000) }],
    }, { Authorization: `Bearer ${lineToken}` })]);
  }

  const webhook = env("NOTIFY_WEBHOOK_URL");
  if (webhook) {
    tasks.push(["webhook", () => post(webhook, { content: message, text: message })]);
  }

  if (tasks.length === 0) {
    console.warn("[NOTIFY] ⚠️ 沒有設定任何通知管道，以上訊息老闆收不到。請設定 TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID");
    return { delivered, failed };
  }

  await Promise.all(tasks.map(async ([name, send]) => {
    try { await send(); delivered.push(name); }
    catch (e) { failed.push(name); console.error(`[NOTIFY] ${name} 發送失敗:`, e); }
  }));
  return { delivered, failed };
}
