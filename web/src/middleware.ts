// 後台保護：用 cookie session（不再用 Basic Auth 跳彈窗）
// 未登入訪問 /admin/* → 自動跳 /admin/login
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "istyle_admin";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  // login 頁本身不擋
  if (pathname === "/admin/login") return NextResponse.next();

  const expectedSecret = process.env.ADMIN_PASSWORD || "istyle2026Secure";
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === expectedSecret) {
    return NextResponse.next();
  }

  // 未登入 → 跳 login（保留原本目的網址）
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
