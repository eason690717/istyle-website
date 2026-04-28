// 統一的 cron auth：吸收 Vercel cron 的 Bearer token 或手動觸發的 ?secret=
// 防禦性 trim — Vercel env 偶爾會帶 \n 害比對失敗（之前 ECPay 已踩過）
import { NextRequest } from "next/server";

export function checkCronAuth(req: NextRequest): { ok: boolean; reason?: string } {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return { ok: true }; // 沒設 secret = 不檢查（後面會 console.warn）

  const authHeader = (req.headers.get("authorization") || "").trim();
  const querySecret = (req.nextUrl.searchParams.get("secret") || "").trim();

  if (authHeader === `Bearer ${expected}`) return { ok: true };
  if (querySecret === expected) return { ok: true };

  // 多印細節幫忙未來除錯（但不洩露 expected 內容）
  return {
    ok: false,
    reason: `auth failed (header_len=${authHeader.length}, query_len=${querySecret.length}, expected_len=${expected.length})`,
  };
}
