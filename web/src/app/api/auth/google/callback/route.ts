// Google OAuth callback：拿 code → 換 profile → 驗 email → 建 session → 跳回 admin
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForProfile, isEmailAllowed } from "@/lib/google-auth";
import { COOKIE_NAME, SESSION_DAYS, createSession, logAttempt, getClientIp } from "@/lib/admin-auth";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "g_oauth_state";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookieRaw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !stateParam || !stateCookieRaw) {
    return NextResponse.redirect(`${url.origin}/admin/login?error=missing_state`);
  }

  let stateData: { state: string; from: string };
  try {
    stateData = JSON.parse(stateCookieRaw);
  } catch {
    return NextResponse.redirect(`${url.origin}/admin/login?error=bad_state`);
  }

  if (stateData.state !== stateParam) {
    return NextResponse.redirect(`${url.origin}/admin/login?error=state_mismatch`);
  }

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const ua = hdrs.get("user-agent") || undefined;

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const profile = await exchangeCodeForProfile(code, redirectUri);

  if (!profile || !profile.emailVerified) {
    await logAttempt({ ip, success: false, reason: "google_no_profile", userAgent: ua });
    return NextResponse.redirect(`${url.origin}/admin/login?error=no_profile`);
  }

  if (!isEmailAllowed(profile.email)) {
    await logAttempt({ ip, user: profile.email, success: false, reason: "email_not_allowed", userAgent: ua });
    return NextResponse.redirect(`${url.origin}/admin/login?error=not_allowed&email=${encodeURIComponent(profile.email)}`);
  }

  // ✅ 通過 — 建 session
  const token = await createSession({ user: profile.email, ip, userAgent: ua });
  await logAttempt({ ip, user: profile.email, success: true, userAgent: ua });

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // ⚠️ lax 才能跨 Google redirect 帶 cookie，不能用 strict
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });

  const dest = stateData.from && stateData.from.startsWith("/admin") ? stateData.from : "/admin";
  return NextResponse.redirect(`${url.origin}${dest}`);
}
