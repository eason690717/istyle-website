"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOverride, clearOverride } from "../actions";

interface PriceRowProps {
  price: {
    id: number;
    itemName: string;
    tier: string;
    calculatedPrice: number | null;
    manualOverride: number | null;
    overrideReason: string | null;
    overriddenAt: string | null;
    overriddenBy: string | null;
  };
}

export function PriceRow({ price }: PriceRowProps) {
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(price.manualOverride?.toString() || price.calculatedPrice?.toString() || "");
  const [reason, setReason] = useState(price.overrideReason || "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const isOverridden = price.manualOverride !== null;
  const finalPrice = price.manualOverride ?? price.calculatedPrice;

  async function save() {
    if (!reason.trim()) { alert("請填寫異動原因"); return; }
    if (!newPrice || isNaN(Number(newPrice))) { alert("請填合法金額"); return; }
    setBusy(true);
    const r = await setOverride({
      priceId: price.id,
      manualOverride: Number(newPrice),
      reason: reason.trim(),
    });
    setBusy(false);
    if (r.ok) {
      setEditing(false);
      router.refresh();
    } else {
      alert(r.error || "儲存失敗");
    }
  }

  async function clear() {
    if (!confirm("確定移除異動價，恢復公式價？")) return;
    setBusy(true);
    await clearOverride(price.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <tr className={`border-b border-[var(--border)]/40 ${isOverridden ? "bg-[var(--gold)]/5" : ""}`}>
        <td className="py-2.5">
          {price.itemName}
          {isOverridden && <span className="ml-1 text-xs">🏷</span>}
        </td>
        <td className="py-2.5 text-xs text-[var(--fg-muted)]">{price.tier}</td>
        <td className="py-2.5 text-right text-xs text-[var(--fg-muted)]">
          {price.calculatedPrice ? `NT$ ${price.calculatedPrice.toLocaleString()}` : "—"}
        </td>
        <td className={`py-2.5 text-right font-mono ${isOverridden ? "text-[var(--gold-bright)]" : ""}`}>
          {finalPrice ? `NT$ ${finalPrice.toLocaleString()}` : "—"}
        </td>
        <td className="py-2.5 text-xs">
          {isOverridden ? (
            <div>
              <div className="text-[var(--fg)]">{price.overrideReason}</div>
              <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
                {price.overriddenBy} · {price.overriddenAt && new Date(price.overriddenAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          ) : (
            <span className="text-[var(--fg-muted)]">—</span>
          )}
        </td>
        <td className="py-2.5 text-right">
          {!editing && (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-[var(--gold)]/40 px-2 py-1 text-[10px] text-[var(--gold)] hover:bg-[var(--gold)]/10"
              >
                {isOverridden ? "改" : "異動"}
              </button>
              {isOverridden && (
                <button
                  onClick={clear}
                  disabled={busy}
                  className="rounded border border-red-500/40 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  恢復公式價
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-[var(--gold)]/30 bg-[var(--gold)]/5">
          <td colSpan={6} className="p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-[var(--gold)]">異動價 NT$</span>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min="0"
                className="w-24 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
                autoFocus
              />
              <span className="font-medium text-[var(--gold)] ml-3">原因</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例：客人指定原廠零件 / 主機板代工漲價 / 季末優惠"
                className="flex-1 min-w-[200px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
              />
              <button
                onClick={save}
                disabled={busy}
                className="btn-gold rounded px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                {busy ? "..." : "儲存"}
              </button>
              <button
                onClick={() => { setEditing(false); setNewPrice(price.manualOverride?.toString() || price.calculatedPrice?.toString() || ""); setReason(price.overrideReason || ""); }}
                className="rounded border border-[var(--border)] px-3 py-1 text-xs"
              >
                取消
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
