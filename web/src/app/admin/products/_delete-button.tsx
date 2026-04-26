"use client";
import { useState, useTransition } from "react";

export function DeleteProductButton({ productId, productName, action }: {
  productId: number;
  productName: string;
  action: (id: number) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-red-400">確定刪除？</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => start(async () => { await action(productId); })}
            disabled={pending}
            className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/30 disabled:opacity-50"
          >
            {pending ? "刪除中..." : "✓ 確認"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded bg-zinc-700/40 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-600/40"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[10px] text-red-400 hover:text-red-300"
      title={`刪除「${productName}」`}
    >
      刪除
    </button>
  );
}
