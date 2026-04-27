// 自建流量分析寫入點：Tracker / 自定義事件都打這個
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IP_SALT = process.env.ANALYTICS_IP_SALT || "istyle-default-salt";

// UA → device / browser / os 簡單判斷（不裝 ua-parser-js 省 bundle）
function parseUa(ua: string) {
  const u = ua.toLowerCase();
  const device =
    /mobile|iphone|ipod|android(?!.*tablet)|windows phone/.test(u) ? "mobile" :
    /ipad|tablet|playbook|silk/.test(u) ? "tablet" : "desktop";
  const browser =
    /edg\//.test(u) ? "Edge" :
    /chrome/.test(u) && !/edg\//.test(u) ? "Chrome" :
    /safari/.test(u) && !/chrome/.test(u) ? "Safari" :
    /firefox/.test(u) ? "Firefox" :
    /msie|trident/.test(u) ? "IE" : "Other";
  const os =
    /windows nt/.test(u) ? "Windows" :
    /macintosh|mac os x/.test(u) ? "macOS" :
    /android/.test(u) ? "Android" :
    /iphone|ipad|ipod/.test(u) ? "iOS" :
    /linux/.test(u) ? "Linux" : "Other";
  return { device, browser, os };
}

interface TrackBody {
  type: "pageview" | "event";
  path?: string;
  referrer?: string;
  sessionId: string;
  // event only
  name?: string;
  data?: unknown;
}

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!body.sessionId) {
    return Response.json({ ok: false, error: "missing sessionId" }, { status: 400 });
  }

  // 從 request 摘 server-side 中繼資料
  const ua = req.headers.get("user-agent") || "";
  const { device, browser, os } = parseUa(ua);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const ipHash = ip ? createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 32) : null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const city = req.headers.get("x-vercel-ip-city")
    ? decodeURIComponent(req.headers.get("x-vercel-ip-city")!)
    : null;

  try {
    if (body.type === "pageview") {
      const path = (body.path || "/").slice(0, 500);
      // utm 從 path 拆（如果 client 把 search 也送進來）
      let utmSource: string | null = null;
      let utmMedium: string | null = null;
      let utmCampaign: string | null = null;
      const qIdx = path.indexOf("?");
      if (qIdx >= 0) {
        const params = new URLSearchParams(path.slice(qIdx + 1));
        utmSource = params.get("utm_source");
        utmMedium = params.get("utm_medium");
        utmCampaign = params.get("utm_campaign");
      }
      await prisma.pageView.create({
        data: {
          path: path.slice(0, qIdx >= 0 ? qIdx : undefined),
          referrer: (body.referrer || "(direct)").slice(0, 500),
          utmSource,
          utmMedium,
          utmCampaign,
          sessionId: body.sessionId,
          ipHash,
          country,
          city,
          device,
          browser,
          os,
        },
      });
    } else if (body.type === "event") {
      if (!body.name) return Response.json({ ok: false, error: "missing name" }, { status: 400 });
      await prisma.analyticsEvent.create({
        data: {
          name: body.name.slice(0, 64),
          path: body.path?.slice(0, 500) || null,
          sessionId: body.sessionId,
          data: body.data ? JSON.stringify(body.data).slice(0, 2000) : null,
        },
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[track] write failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
