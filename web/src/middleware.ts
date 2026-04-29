// 中介層：1) 後台保護  2) 舊 EasyStore URL 全面 301 redirect
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "istyle_sess";

function decodeSlug(s: string): string {
  try { return decodeURIComponent(s).toLowerCase(); } catch { return s.toLowerCase(); }
}

// 舊 EasyStore /pages/{中文 slug} → 新頁映射（按關鍵字猜對應）
function mapLegacyPage(rawSlug: string): string {
  const s = decodeSlug(rawSlug);
  // 順序：先比對最具體的
  if (/回收|收購|trade.?in|二手/.test(s)) return "/recycle";
  if (/預約|booking|appointment/.test(s)) return "/booking";
  if (/報價|quote|價格表|價錢表|price/.test(s)) return "/quote";
  if (/案例|案件|實績|case/.test(s)) return "/cases";
  if (/部落格|文章|新聞|blog|news/.test(s)) return "/blog";
  if (/商城|商品|購物|shop/.test(s)) return "/shop";
  if (/關於|about|介紹/.test(s)) return "/about";
  if (/維修|修理|repair|service|拆機|教學/.test(s)) return "/services";
  if (/聯絡|contact/.test(s)) return "/booking";
  if (/換機|決策|選機/.test(s)) return "/upgrade-tool";
  return "/";
}

// 舊 /collections/{slug} 映射（EasyStore 分類頁）
function mapLegacyCollection(rawSlug: string): string {
  const s = decodeSlug(rawSlug);
  if (/回收|收購|二手/.test(s)) return "/recycle";
  if (/維修|repair/.test(s)) return "/quote";
  if (/iphone|ipad|macbook|ipod/.test(s)) return `/quote/apple`;
  if (/samsung|三星/.test(s)) return `/quote/samsung`;
  if (/google|pixel/.test(s)) return `/quote/google`;
  if (/sony|索尼/.test(s)) return `/quote/sony`;
  if (/asus|華碩/.test(s)) return `/quote/asus`;
  if (/oppo/.test(s)) return `/quote/oppo`;
  if (/xiaomi|小米/.test(s)) return `/quote/xiaomi`;
  if (/switch|遊戲/.test(s)) return `/quote/nintendo`;
  if (/dyson/.test(s)) return `/services`;
  return "/shop";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // === 1. EasyStore /pages/* ===
  if (pathname.startsWith("/pages/")) {
    const dest = mapLegacyPage(pathname.slice("/pages/".length));
    return doRedirect(req, dest);
  }

  // === 2. EasyStore /products/{slug}（商品舊連結 → 新 /shop/{slug} 或 fallback /shop）===
  if (pathname.startsWith("/products/")) {
    const slug = pathname.slice("/products/".length);
    // 試著用相同 slug 導 /shop/{slug}（如果商品有遷移過去 slug 可能對得上）
    // 但因為 EasyStore slug 大多是中文，這邊一律導去 /shop 列表
    const decoded = decodeSlug(slug);
    if (/iphone/.test(decoded)) return doRedirect(req, "/quote/apple");
    if (/samsung/.test(decoded)) return doRedirect(req, "/quote/samsung");
    if (/回收|收購/.test(decoded)) return doRedirect(req, "/recycle");
    return doRedirect(req, "/shop");
  }

  // === 3. EasyStore /collections/* → 對應分類 ===
  if (pathname.startsWith("/collections/")) {
    const dest = mapLegacyCollection(pathname.slice("/collections/".length));
    return doRedirect(req, dest);
  }

  // === 4. EasyStore /blogs/* → /blog ===
  if (pathname.startsWith("/blogs/") || pathname === "/blogs") {
    return doRedirect(req, "/blog");
  }

  // === 5. EasyStore /search → /shop ===
  if (pathname === "/search") {
    return doRedirect(req, "/shop");
  }

  // === 6. EasyStore /account/* → 登入後台 (admin/login) ===
  if (pathname.startsWith("/account")) {
    return doRedirect(req, "/booking");
  }

  // === 7. 後台保護 ===
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!cookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // === 8. POS 結帳台保護（店員 PIN）===
  if (pathname.startsWith("/pos") && pathname !== "/pos/login") {
    const staffCookie = req.cookies.get("istyle_staff")?.value;
    if (!staffCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/pos/login";
      return NextResponse.redirect(url);
    }
  }

  // === 9. /m 行動工作站（admin OR staff 都可進）===
  if (pathname.startsWith("/m")) {
    const adminTok = req.cookies.get(COOKIE_NAME)?.value;
    const staffTok = req.cookies.get("istyle_staff")?.value;
    if (!adminTok && !staffTok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // 注入 pathname header — 讓 layout 元件能判斷現在頁面是 admin / pos / public
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
}

function doRedirect(req: NextRequest, dest: string) {
  const url = req.nextUrl.clone();
  url.pathname = dest;
  url.search = "";  // 清掉舊參數
  return NextResponse.redirect(url, 301);  // 301 永久 → Google 會更新索引
}

export const config = {
  // 匹配所有頁面（除 next 內部 / API / 靜態資源），這樣 x-pathname 才能注入到所有頁
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)",
  ],
};
