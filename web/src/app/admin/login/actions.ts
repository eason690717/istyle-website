"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME, SESSION_DAYS,
  createSession, safeEqual, logAttempt, isIpLocked, getClientIp, isIpAllowed,
} from "@/lib/admin-auth";

// 真實但安全的錯誤訊息：
//   - 帳密錯誤 → 通用訊息（不告知哪邊錯，防探測有效帳號）
//   - 環境問題（IP/鎖定）→ 明確訊息（讓老闆知道怎麼排除）
const CRED_ERROR = "帳號或密碼不正確";

export async function loginAction({ user, pwd, hp, from }: { user: string; pwd: string; hp?: string; from?: string }) {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const ua = hdrs.get("user-agent") || undefined;

  // ⭐ IP 白名單（最高優先 — 直接告知，老闆才知道要更新名單）
  if (!isIpAllowed(ip)) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "ip_not_allowed", userAgent: ua });
    return { error: `🚫 此 IP（${ip}）不在允許名單。請聯絡管理員加入白名單。` };
  }

  // 速率限制（清楚告知，避免老闆繼續嘗試加深鎖定）
  if (await isIpLocked(ip)) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "ip_locked", userAgent: ua });
    return { error: "⏱️ 嘗試次數過多（防爆破鎖定）。請等 15 分鐘後再試，或聯絡管理員清除鎖定。" };
  }

  // 蜜罐（機器人才會觸發，正常使用者看不到）→ 安靜回傳通用錯誤
  if (hp && hp.length > 0) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "honeypot", userAgent: ua });
    return { error: CRED_ERROR };
  }

  const expectedUser = process.env.ADMIN_USER || "admin@i-style.store";
  const expectedPwd = process.env.ADMIN_PASSWORD || "istyle2026Secure";

  // constant-time compare
  const userOk = safeEqual(user.trim(), expectedUser);
  const pwdOk = safeEqual(pwd, expectedPwd);

  if (!userOk || !pwdOk) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "wrong_credentials", userAgent: ua });
    return { error: CRED_ERROR };
  }

  // 成功 → 建立 session
  const token = await createSession({ user: expectedUser, ip, userAgent: ua });
  await logAttempt({ ip, user: expectedUser, success: true, userAgent: ua });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict", // 強化：strict 防 CSRF
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });

  redirect(from && from.startsWith("/admin") ? from : "/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const { revokeSession } = await import("@/lib/admin-auth");
    await revokeSession(token);
  }
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
