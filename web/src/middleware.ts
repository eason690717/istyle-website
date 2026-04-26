// 後台保護：cookie session（DB 驗證）
// 注意：edge middleware 不能直接呼 prisma，所以這裡只檢查 cookie 存在
// 真正的 DB 驗證在 admin layout 的 server component 做
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "istyle_sess";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  // 只檢查 cookie 存在；不存在直接導 login
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
