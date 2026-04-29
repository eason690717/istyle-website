"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "../../actions";
import { toast } from "@/components/toast";

export function ReceiptActions({ saleId, canVoid }: { saleId: number; canVoid: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function print() {
    window.print();
  }

  function doVoid() {
    const reason = window.prompt("作廢原因（必填）");
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      const r = await voidSale(saleId, reason.trim());
      if (r.ok) { toast.success("已作廢"); router.refresh(); }
      else toast.error(r.error || "作廢失敗");
    });
  }

  return (
    <div className="flex gap-2">
      <button onClick={print} className="btn-gold rounded-full px-4 py-2 text-xs font-semibold">🖨 列印收據</button>
      {canVoid && (
        <button
          onClick={doVoid}
          disabled={pending}
          className="rounded-full border border-red-500/40 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {pending ? "處理中..." : "作廢"}
        </button>
      )}
    </div>
  );
}
