"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SID_KEY = "istyle_sid";

function getOrCreateSessionId(): string {
  if (typeof document === "undefined") return "";
  // 從 cookie 讀
  const m = document.cookie.match(/(?:^|;\s*)istyle_sid=([^;]+)/);
  if (m) return m[1];
  // 沒有就建一個，30 分鐘 expiry
  const sid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  document.cookie = `${SID_KEY}=${sid}; path=/; max-age=1800; SameSite=Lax`;
  return sid;
}

function refreshSessionExpiry(sid: string) {
  document.cookie = `${SID_KEY}=${sid}; path=/; max-age=1800; SameSite=Lax`;
}

export function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    // 不追 admin 後台、API、Next 內部資源
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return;

    const sid = getOrCreateSessionId();
    refreshSessionExpiry(sid);

    const queryString = search?.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    const referrer = document.referrer || "(direct)";

    const body = JSON.stringify({
      type: "pageview",
      path: fullPath,
      referrer,
      sessionId: sid,
    });

    // 優先 sendBeacon（離開頁面也能送），fallback fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname, search]);

  return null;
}

// 對外 helper：埋自定義事件用
// import { trackEvent } from "@/components/tracker"
// trackEvent("add_to_cart", { sku: "iphone-15-pro-clear-case", price: 350 })
export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof document === "undefined") return;
  const sid = getOrCreateSessionId();
  const body = JSON.stringify({
    type: "event",
    name,
    path: window.location.pathname,
    sessionId: sid,
    data,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  } else {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}
