import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const STATUS_INFO: Record<string, { label: string; emoji: string; color: string; weight: number }> = {
  RECEIVED:        { label: "已收件",   emoji: "📦", color: "text-blue-400",   weight: 1 },
  DIAGNOSING:     { label: "檢測中",   emoji: "🔍", color: "text-yellow-400", weight: 2 },
  AWAITING_PARTS: { label: "等候零件", emoji: "📥", color: "text-orange-400", weight: 3 },
  REPAIRING:      { label: "維修中",   emoji: "🔧", color: "text-purple-400", weight: 4 },
  DONE:           { label: "已完工",   emoji: "✅", color: "text-green-400",  weight: 5 },
  PICKED_UP:      { label: "已取件",   emoji: "🎉", color: "text-[var(--gold)]", weight: 6 },
  CANCELLED:      { label: "取消",     emoji: "❌", color: "text-red-400",    weight: 0 },
};

export const metadata: Metadata = {
  title: "維修進度",
  robots: { index: false, follow: false },
};

interface TimelineEntry {
  at: string;
  status: string;
  note?: string;
  photos?: string[];
}

export default async function RepairTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticket: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { ticket } = await params;
  const { p: phoneLast4 } = await searchParams;

  if (!phoneLast4) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-[var(--fg-muted)]">請從查詢頁進入</p>
        <Link href="/repair/lookup" className="mt-4 inline-block text-sm text-[var(--gold)] underline">
          回到查詢頁
        </Link>
      </div>
    );
  }

  const t = await prisma.repairTicket.findUnique({
    where: { ticketNumber: ticket.toUpperCase() },
  }).catch(() => null);

  // 防探測：找不到單號 OR 手機末 4 碼不對 → 一律顯示同一個錯誤訊息
  if (!t || t.phoneLast4 !== phoneLast4) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="mb-2 text-3xl">🔒</div>
          <p className="font-medium text-[var(--fg)]">查無此單或末 4 碼錯誤</p>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            為保護隱私，無法告知是哪邊不符。請確認後重試。
          </p>
        </div>
        <Link href="/repair/lookup" className="mt-6 inline-block text-sm text-[var(--gold)] underline">
          重新查詢
        </Link>
      </div>
    );
  }

  // 解析 timeline
  let timeline: TimelineEntry[] = [];
  try {
    timeline = JSON.parse(t.timeline);
  } catch { timeline = []; }
  // 加上「收件」的最初項目
  if (timeline.length === 0) {
    timeline = [{ at: t.createdAt.toISOString(), status: "RECEIVED", note: "已收到您的裝置" }];
  }
  timeline = timeline.slice().reverse(); // 新的在上

  const cur = STATUS_INFO[t.status] || STATUS_INFO.RECEIVED;
  const fmtDate = (s: string) => new Date(s).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* 狀態大標 */}
      <div className="rounded-2xl border-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-6 text-center">
        <div className="text-5xl">{cur.emoji}</div>
        <div className={`mt-3 font-serif text-3xl ${cur.color}`}>{cur.label}</div>
        <div className="mt-1 text-xs text-[var(--fg-muted)]">單號 {t.ticketNumber}</div>
      </div>

      {/* 進度條 */}
      <div className="mt-6 grid grid-cols-6 gap-1">
        {(["RECEIVED", "DIAGNOSING", "AWAITING_PARTS", "REPAIRING", "DONE", "PICKED_UP"] as const).map((s) => {
          const info = STATUS_INFO[s];
          const reached = info.weight <= cur.weight;
          return (
            <div key={s} className="text-center">
              <div className={`mx-auto mb-1 h-2 rounded-full ${reached ? "bg-[var(--gold)]" : "bg-[var(--border)]"}`} />
              <div className={`text-[10px] ${reached ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}>{info.label}</div>
            </div>
          );
        })}
      </div>

      {/* 基本資訊 */}
      <div className="mt-6 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <Row k="客戶" v={t.customerName} />
        <Row k="裝置" v={t.deviceModel} />
        <Row k="問題" v={t.issueDescription} />
        {t.estimatedCost != null && <Row k="預估費用" v={`NT$ ${t.estimatedCost.toLocaleString()}`} />}
        {t.finalCost != null && <Row k="實際費用" v={`NT$ ${t.finalCost.toLocaleString()}`} highlight />}
        {t.estimatedDoneAt && <Row k="預計完工" v={fmtDate(t.estimatedDoneAt.toISOString())} />}
        <Row k="收件時間" v={fmtDate(t.createdAt.toISOString())} />
      </div>

      {/* 進度時間軸 */}
      <h2 className="mt-8 font-serif text-lg text-[var(--gold)]">📋 進度紀錄</h2>
      <div className="mt-3 space-y-4">
        {timeline.map((e, i) => {
          const info = STATUS_INFO[e.status] || STATUS_INFO.RECEIVED;
          return (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info.emoji}</span>
                  <span className={`font-medium ${info.color}`}>{info.label}</span>
                </div>
                <span className="text-xs text-[var(--fg-muted)]">{fmtDate(e.at)}</span>
              </div>
              {e.note && <p className="mt-2 text-sm text-[var(--fg)]">{e.note}</p>}
              {e.photos && e.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {e.photos.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={url}
                        alt={`進度照片 ${j + 1}`}
                        width={200}
                        height={200}
                        className="aspect-square w-full rounded border border-[var(--border)] object-cover transition hover:opacity-80"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 text-center text-xs text-[var(--fg-muted)]">
        有任何疑問請 LINE 聯絡：<a href="https://line.me/R/ti/p/@i-style" className="text-[var(--gold)] underline">@i-style</a>
      </div>
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-[var(--fg-muted)]">{k}</span>
      <span className={`text-right ${highlight ? "font-semibold text-[var(--gold)]" : ""}`}>{v}</span>
    </div>
  );
}
