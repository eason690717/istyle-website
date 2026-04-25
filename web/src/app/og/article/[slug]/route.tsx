// 動態 OG 圖：每篇文章自動生成圖文一致的封面（黑金品牌風格）
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 86400;

// 主題 icon（SVG path） — 依關鍵字選 icon
const ICONS: Array<{ kw: RegExp; path: string }> = [
  { kw: /電池|膨脹|續航|健康度|過熱/i, path: "M9 4h6v2h-1v14h-4V6H9V4zm1 4v10h4V8h-4z" },  // battery
  { kw: /螢幕|綠屏|破裂|玻璃|觸控|液晶|顯示/i, path: "M4 5h16v12H4V5zm2 2v8h12V7H6zm2 12h8v2H8v-2z" }, // screen
  { kw: /macbook|筆電|mac\s*air|mac\s*pro/i, path: "M3 5h18v11H3V5zm2 2v7h14V7H5zm-2 11h18v2H3v-2z" }, // laptop
  { kw: /回收|賣|二手|收購/i, path: "M12 2l3 3-3 3M12 8v8m-3 3l3 3 3-3" }, // arrows
  { kw: /主機板|機板|焊接|拆機|零件|cpu/i, path: "M6 8h12v8H6V8zm-2 4h-2m20 0h-2M10 4v-2m4 2v-2m-4 20v-2m4 2v-2" }, // chip
  { kw: /switch|joy.?con|遊戲主機/i, path: "M5 7h14v10H5V7zm-3 5h2m17 0h2M8 12h2m4 0h2" },
  { kw: /dyson|吸塵器/i, path: "M4 4l16 8-16 8V4z" },
];

function pickIcon(text: string): string {
  for (const i of ICONS) if (i.kw.test(text)) return i.path;
  return "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7l3-7z"; // star fallback
}

function pickEmoji(text: string): string {
  if (/電池|膨脹|續航|健康度/i.test(text)) return "🔋";
  if (/過熱|發燙|降頻/i.test(text)) return "🔥";
  if (/螢幕|綠屏|破裂|玻璃|液晶|顯示/i.test(text)) return "📱";
  if (/觸控失靈/i.test(text)) return "👆";
  if (/macbook|筆電|mac\s*air|mac\s*pro/i.test(text)) return "💻";
  if (/ipad|平板/i.test(text)) return "📲";
  if (/回收|賣|二手|收購/i.test(text)) return "💰";
  if (/主機板|機板|焊接|拆機|零件|cpu/i.test(text)) return "🔧";
  if (/switch|joy.?con|遊戲主機|nintendo/i.test(text)) return "🎮";
  if (/dyson|吸塵器/i.test(text)) return "🌪️";
  if (/板橋|江子翠|門市|推薦/i.test(text)) return "📍";
  if (/face\s*id|人臉/i.test(text)) return "👤";
  return "🛠️";
}

async function findArticle(slug: string): Promise<{ title: string; category?: string } | null> {
  // 先查手動文章
  const manual = BLOG_POSTS.find(p => p.slug === slug);
  if (manual) return { title: manual.title, category: manual.category };
  // 再查自動文章
  const auto = await prisma.autoArticle.findUnique({
    where: { slug },
    select: { title: true, kind: true },
  }).catch(() => null);
  if (auto) return { title: auto.title, category: auto.kind };
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await findArticle(slug);
  const title = a?.title || "i時代 — 手機維修專家";
  const emoji = pickEmoji(title);

  // 標題截斷至約 28 字（兩行）
  const maxLine = 18;
  const lines: string[] = [];
  let buf = "";
  for (const ch of title) {
    if (buf.length >= maxLine) { lines.push(buf); buf = ""; }
    buf += ch;
    if (lines.length >= 2) break;
  }
  if (buf && lines.length < 3) lines.push(buf);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          padding: "60px 80px", justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1410 50%, #0a0a0a 100%)",
          color: "#f5f0e8",
          fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
        }}
      >
        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, color: "#c9a96e", fontWeight: 700, letterSpacing: "0.05em" }}>
              i時代
            </div>
            <div style={{ fontSize: 16, color: "#a88b4f", letterSpacing: "0.3em", marginTop: 2 }}>
              手機維修專家
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#a88b4f", textAlign: "right", display: "flex", flexDirection: "column" }}>
            <div>i-style.store</div>
            <div style={{ marginTop: 2 }}>板橋・江子翠</div>
          </div>
        </div>

        {/* Center: title + emoji */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 20 }}>
          <div style={{ fontSize: 140, lineHeight: 1 }}>{emoji}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {lines.map((ln, i) => (
              <div
                key={i}
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: i === 0 ? "#c9a96e" : "#f5f0e8",
                  lineHeight: 1.2,
                  marginTop: i > 0 ? 8 : 0,
                }}
              >
                {ln}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: gold bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ height: 4, width: 120, background: "#c9a96e" }} />
          <div style={{ display: "flex", gap: 20, fontSize: 16, color: "#a88b4f" }}>
            <span>14 年技術經驗</span>
            <span>．</span>
            <span>透明報價</span>
            <span>．</span>
            <span>當日完工</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
