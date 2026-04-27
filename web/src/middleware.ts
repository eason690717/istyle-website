// 中介層：1) 後台保護  2) 舊 EasyStore /pages/* URL 智能 301 → 對應新頁
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "istyle_sess";

// 舊 EasyStore /pages/{中文 slug} → 新頁映射（按關鍵字猜對應）
function mapLegacyPage(slug: string): string {
  // URL 進來時可能已 decode 也可能沒，雙保險
  let s: string;
  try { s = decodeURIComponent(slug); } catch { s = slug; }
  s = s.toLowerCase();

  // 順序很重要 — 先比對最具體的
  if (/回收|收購|trade.?in|二手/.test(s)) return "/recycle";
  if (/預約|booking|appointment/.test(s)) return "/booking";
  if (/報價|quote|價格表|價錢表|price/.test(s)) return "/quote";
  if (/案例|案件|實績|case/.test(s)) return "/cases";
  if (/部落格|文章|新聞|blog|news/.test(s)) return "/blog";
  if (/商城|商品|購物|shop/.test(s)) return "/shop";
  if (/關於|about|介紹/.test(s)) return "/about";
  if (/維修|修理|repair|service/.test(s)) return "/services";
  if (/聯絡|contact/.test(s)) return "/booking";
  // 完全沒猜到 → 首頁
  return "/";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // === 1. 舊 EasyStore /pages/* → 301 redirect ===
  if (pathname.startsWith("/pages/")) {
    const slug = pathname.slice("/pages/".length);
    const dest = mapLegacyPage(slug);
    const url = req.nextUrl.clone();
    url.pathname = dest;
    url.search = "";  // 清掉舊參數
    return NextResponse.redirect(url, 301);  // 301 永久 → Google 會更新索引
  }

  // === 2. 後台保護 ===
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

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
  matcher: ["/admin/:path*", "/pages/:path*"],
};
