"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME, SESSION_DAYS,
  createSession, safeEqual, logAttempt, isIpLocked, getClientIp, isIpAllowed,
} from "@/lib/admin-auth";

// 通用錯誤訊息（不洩漏哪邊錯）
const GENERIC_ERROR = "帳號或密碼不正確";

export async function loginAction({ user, pwd, hp, from }: { user: string; pwd: string; hp?: string; from?: string }) {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const ua = hdrs.get("user-agent") || undefined;

  // ⭐ IP 白名單（最強保護）— 不在白名單一律拒絕，連嘗試機會都沒有
  if (!isIpAllowed(ip)) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "ip_not_allowed", userAgent: ua });
    // 通用錯誤訊息（不告知是 IP 問題，避免攻擊者得知白名單機制）
    return { error: GENERIC_ERROR };
  }

  // 蜜罐欄位（機器人會填）
  if (hp && hp.length > 0) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "honeypot", userAgent: ua });
    return { error: GENERIC_ERROR };
  }

  // 速率限制：15 分鐘內失敗 5 次 → 鎖
  if (await isIpLocked(ip)) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "ip_locked", userAgent: ua });
    return { error: "嘗試次數過多，請 15 分鐘後再試" };
  }

  const expectedUser = process.env.ADMIN_USER || "admin@i-style.store";
  const expectedPwd = process.env.ADMIN_PASSWORD || "istyle2026Secure";

  // constant-time compare
  const userOk = safeEqual(user.trim(), expectedUser);
  const pwdOk = safeEqual(pwd, expectedPwd);

  if (!userOk || !pwdOk) {
    await logAttempt({ ip, user: user.slice(0, 50), success: false, reason: "wrong_credentials", userAgent: ua });
    return { error: GENERIC_ERROR };
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
