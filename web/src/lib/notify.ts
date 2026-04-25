// 通知工具 — 預約/詢價/訂單建立時用 LINE Notify 通知老闆
// 設定 LINE_NOTIFY_TOKEN 環境變數
// 註：LINE Notify 已停止服務（2025/03/31）。此處先預留介面，未來改用 LINE Messaging API。
// 暫時改用 console + email 後備

export async function notifyOwner(message: string) {
  // 1. console (開發看)
  console.log("[NOTIFY]", message);

  // 2. LINE Messaging API (production)
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = process.env.LINE_OWNER_USER_ID;
  if (channelAccessToken && targetUserId) {
    try {
      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({
          to: targetUserId,
          messages: [{ type: "text", text: message.slice(0, 5000) }],
        }),
      });
    } catch (e) {
      console.error("LINE push failed:", e);
    }
  }

  // 3. Webhook 備援（可串 Discord / Slack / Telegram）
  const webhook = process.env.NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, text: message }),
      });
    } catch (e) {
      console.error("Webhook failed:", e);
    }
  }
}
