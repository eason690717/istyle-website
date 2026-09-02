import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditTicketForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditRepairPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.repairTicket.findUnique({ where: { id: Number(id) } });
  if (!t) return notFound();

  let timeline: Array<{ at: string; status: string; note?: string; photos?: string[] }> = [];
  try { timeline = JSON.parse(t.timeline); } catch { timeline = []; }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/repairs" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回維修單列表</Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-[var(--gold)]">維修單 {t.ticketNumber}</h1>
          <Link
            href={`/repair/${t.ticketNumber}?p=${t.phoneLast4}`}
            target="_blank"
            className="text-xs text-[var(--gold)] hover:underline"
          >
            🔗 客戶查詢頁（新分頁）
          </Link>
        </div>
        <div className="mt-1 text-xs text-[var(--fg-muted)]">
          客戶：{t.customerName} · 末 4: {t.phoneLast4} · 裝置：{t.deviceModel}<br />
          問題：{t.issueDescription}
        </div>
      </div>

      <EditTicketForm
        id={t.id}
        currentStatus={t.status}
        estimatedCost={t.estimatedCost}
        finalCost={t.finalCost}
        internalNotes={t.internalNotes}
      />

      {/* 結帳快速 deeplink — 把維修單轉成 POS 結帳 */}
      {(t.status === "DONE" || t.status === "PICKED_UP") && (
        <section className="rounded-lg border-2 border-[var(--gold)]/40 bg-[var(--gold)]/5 p-4">
          <h2 className="font-serif text-base text-[var(--gold)]">💰 結帳</h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">在 POS 結帳台快速建立此維修的銷售紀錄</p>
          <Link
            href={`/pos?repair=${t.id}&label=${encodeURIComponent(`維修 ${t.deviceModel} - ${t.issueDescription}`.slice(0, 80))}&amount=${t.finalCost ?? t.estimatedCost ?? 0}&customer=${encodeURIComponent(t.customerName)}&phone=${t.phoneLast4}`}
            target="_blank"
            className="mt-3 inline-block rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-5 py-2 text-sm font-bold text-black"
          >
            → 帶資料到 POS 結帳
          </Link>
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h2 className="mb-3 font-serif text-base text-[var(--gold)]">📋 進度紀錄（{timeline.length} 筆）</h2>
        {timeline.length === 0 ? (
          <p className="text-xs text-[var(--fg-muted)]">尚無紀錄</p>
        ) : (
          <div className="space-y-2 text-xs">
            {[...timeline].reverse().map((e, i) => (
              <div key={i} className="rounded border border-[var(--border)] p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{e.status}</span>
                  <span className="text-[var(--fg-muted)]">{new Date(e.at).toLocaleString("zh-TW", { hour12: false })}</span>
                </div>
                {e.note && <p className="mt-1 text-[var(--fg-muted)]">{e.note}</p>}
                {e.photos && e.photos.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {e.photos.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="h-12 w-12 rounded border border-[var(--border)] object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
