// 保護 /admin/* 路由：Basic Auth
// 設定 ADMIN_USER + ADMIN_PASSWORD 環境變數
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const expectedUser = process.env.ADMIN_USER || "admin@i-style.store";
  const expectedPass = process.env.ADMIN_PASSWORD || "istyle2026";

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const [u, p] = decoded.split(":");
    if (u === expectedUser && p === expectedPass) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="i時代 後台"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
