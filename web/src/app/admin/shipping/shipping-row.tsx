"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markShipped, unmarkShipped } from "./actions";

interface Link {
  id: number;
  token: string;
  amount: number;
  itemName: string;
  description: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  shippingProvider: string | null;
  trackingNumber: string | null;
  shippingNote: string | null;
  shippedAt: string | null;
}

const PROVIDERS = ["7-11 賣貨便", "全家 賣貨便", "順豐速運", "黑貓宅急便", "拉拉快遞", "客戶自取", "其他"];

export function ShippingRow({ link }: { link: Link }) {
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState(link.shippingProvider || PROVIDERS[0]);
  const [tracking, setTracking] = useState(link.trackingNumber || "");
  const [note, setNote] = useState(link.shippingNote || "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function copyShippingInfo() {
    const text = [
      `客戶：${link.customerName || "—"}`,
      `電話：${link.customerPhone || "—"}`,
      link.customerEmail ? `Email：${link.customerEmail}` : "",
      `品項：${link.itemName}`,
      `金額：NT$ ${link.amount.toLocaleString()}`,
      link.description ? `備註：${link.description}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => alert("✅ 已複製到剪貼簿"));
  }

  function save() {
    startTransition(async () => {
      const r = await markShipped({
        paymentLinkId: link.id,
        shippingProvider: provider,
        trackingNumber: tracking,
        shippingNote: note,
      });
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else {
        alert(r.error || "失敗");
      }
    });
  }

  function unmark() {
    if (!confirm("取消已出貨標記？")) return;
    startTransition(async () => {
      await unmarkShipped(link.id);
      router.refresh();
    });
  }

  const isShipped = !!link.shippedAt;

  return (
    <div className={`rounded-lg border p-4 ${isShipped ? "border-green-500/40 bg-green-500/5" : "border-[var(--gold)]/30 bg-[var(--bg-elevated)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs text-[var(--gold)]">{link.token.slice(0, 12).toUpperCase()}</span>
            <span className="font-medium">{link.customerName || "—"}</span>
            <span className="text-xs text-[var(--fg-muted)]">{link.customerPhone}</span>
            <span className="text-xs text-[var(--gold-bright)]">NT$ {link.amount.toLocaleString()}</span>
          </div>
          <div className="mt-1 text-xs text-[var(--fg-muted)] line-clamp-1">{link.itemName}</div>
          {link.description && <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{link.description}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] text-[var(--fg-muted)]">
          {link.paidAt && <span>付款 {new Date(link.paidAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</span>}
          {isShipped && <span className="text-green-400">已寄 {new Date(link.shippedAt!).toLocaleString("zh-TW", { hour12: false, dateStyle: "short" })}</span>}
        </div>
      </div>

      {/* 已出貨：顯示運單；待出貨：顯示操作 */}
      {isShipped ? (
        <div className="mt-3 flex items-center justify-between rounded bg-black/30 p-2 text-xs">
          <span><span className="text-[var(--fg-muted)]">{link.shippingProvider}</span> · <span className="font-mono text-[var(--gold-bright)]">{link.trackingNumber}</span></span>
          <button onClick={unmark} disabled={pending} className="text-red-400 hover:underline">取消標記</button>
        </div>
      ) : (
        <div className="mt-3">
          {!editing ? (
            <div className="flex gap-2">
              <button onClick={copyShippingInfo} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:border-[var(--gold)]">📋 複製收件資訊</button>
              <button onClick={() => setEditing(true)} className="btn-gold rounded-full px-3 py-1.5 text-xs">✓ 標記已出貨</button>
            </div>
          ) : (
            <div className="space-y-2 rounded bg-black/30 p-3">
              <div className="flex flex-wrap gap-2">
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs">
                  {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="運單號碼" className="flex-1 min-w-[150px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs" autoFocus />
              </div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註（可選）" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs" />
              <div className="flex gap-2">
                <button onClick={save} disabled={pending || !tracking.trim()} className="btn-gold flex-1 rounded-full py-1.5 text-xs disabled:opacity-50">{pending ? "..." : "儲存（會 LINE 通知老闆）"}</button>
                <button onClick={() => setEditing(false)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs">取消</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
