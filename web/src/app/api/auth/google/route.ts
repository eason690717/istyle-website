// 進入點：跳轉到 Google OAuth 授權頁
import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google-auth";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "g_oauth_state";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "/admin";
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // CSRF：state token 隨機產生並寫 cookie，callback 驗回來
  const state = crypto.randomBytes(16).toString("base64url");
  const stateCookie = await cookies();
  stateCookie.set(STATE_COOKIE, JSON.stringify({ state, from }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 分鐘
  });

  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
