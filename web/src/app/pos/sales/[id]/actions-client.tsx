"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale, refundSale } from "../../actions";
import { toast } from "@/components/toast";

interface SaleItemMini {
  id: number;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  serial: string | null;
}

export function ReceiptActions({ saleId, canVoid, items, total, status }: {
  saleId: number;
  canVoid: boolean;
  items: SaleItemMini[];
  total: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [refundOpen, setRefundOpen] = useState(false);
  const router = useRouter();

  function print() { window.print(); }

  function doVoid() {
    const reason = window.prompt("作廢原因（必填）");
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      const r = await voidSale(saleId, reason.trim());
      if (r.ok) { toast.success("已作廢"); router.refresh(); }
      else toast.error(r.error || "作廢失敗");
    });
  }

  const isVoidable = canVoid && status !== "VOID" && status !== "REFUNDED";

  return (
    <>
      <div className="flex gap-2">
        <button onClick={print} className="btn-gold rounded-full px-4 py-2 text-xs font-semibold">🖨 列印</button>
        {isVoidable && (
          <button
            onClick={() => setRefundOpen(true)}
            disabled={pending}
            className="rounded-full border border-orange-500/40 px-4 py-2 text-xs text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
          >
            退款
          </button>
        )}
        {isVoidable && (
          <button
            onClick={doVoid}
            disabled={pending}
            className="rounded-full border border-red-500/40 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            {pending ? "處理中..." : "作廢"}
          </button>
        )}
      </div>
      {refundOpen && (
        <RefundDialog
          saleId={saleId}
          items={items}
          totalLimit={total}
          onClose={() => setRefundOpen(false)}
          onDone={() => { setRefundOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function RefundDialog({ saleId, items, totalLimit, onClose, onDone }: {
  saleId: number;
  items: SaleItemMini[];
  totalLimit: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(id: number) {
    const s = new Set(picked);
    if (s.has(id)) s.delete(id); else s.add(id);
    setPicked(s);
  }

  const refundAmount = items.filter(i => picked.has(i.id)).reduce((s, i) => s + i.lineTotal, 0);

  function submit() {
    if (picked.size === 0) { toast.error("請選擇要退的品項"); return; }
    if (!reason.trim()) { toast.error("請填退款原因"); return; }
    startTransition(async () => {
      const r = await refundSale(saleId, { reason: reason.trim(), itemIds: Array.from(picked), refundAmount });
      if (r.ok) { toast.success(`已退款 NT$${refundAmount.toLocaleString()}`); onDone(); }
      else toast.error(r.error || "退款失敗");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-orange-500/40 bg-[var(--bg-elevated)] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-lg text-orange-400">↩ 退款 / 部分退款</h3>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">勾選要退的品項，會自動還回庫存與序號</p>

        <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
          {items.map(it => {
            const checked = picked.has(it.id);
            return (
              <label key={it.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-orange-500/60 bg-orange-500/10" : "border-[var(--border)] bg-[var(--bg)]"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(it.id)} className="h-4 w-4 accent-orange-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{it.name}</div>
                  {it.serial && <div className="font-mono text-[10px] text-[var(--fg-muted)]">IMEI: {it.serial}</div>}
                  <div className="text-xs text-[var(--fg-muted)]">${it.unitPrice} × {it.qty}</div>
                </div>
                <div className="font-mono text-sm text-[var(--gold)]">${it.lineTotal.toLocaleString()}</div>
              </label>
            );
          })}
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="退款原因（如：客人 7 天鑑賞期 / 商品瑕疵）"
          className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-500/10 p-3">
          <span className="text-xs text-[var(--fg-muted)]">退款金額（{picked.size} 項，原 NT${totalLimit.toLocaleString()}）</span>
          <span className="font-serif text-2xl font-bold text-orange-400">${refundAmount.toLocaleString()}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm">取消</button>
          <button
            onClick={submit}
            disabled={pending || picked.size === 0 || !reason.trim()}
            className="flex-1 rounded-full bg-gradient-to-r from-orange-600 to-orange-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "處理中..." : `確認退款 $${refundAmount.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
