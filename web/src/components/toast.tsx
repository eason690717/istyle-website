"use client";
// 簡易 toast — 取代 alert()，在手機上不會跳出系統 modal
// 用法：import { toast } from "@/components/toast"; toast.success("已存檔");
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; type: ToastType; message: string; duration: number; }

let listeners: Array<(items: ToastItem[]) => void> = [];
let items: ToastItem[] = [];
let nextId = 1;

function emit() { listeners.forEach(fn => fn([...items])); }

function push(type: ToastType, message: string, duration = 3000) {
  // 為了能在 server side import 也不爆，僅 client 觸發
  if (typeof window === "undefined") return;
  const id = nextId++;
  items = [...items, { id, type, message, duration }];
  emit();
  setTimeout(() => {
    items = items.filter(i => i.id !== id);
    emit();
  }, duration);
  // 觸覺
  if ("vibrate" in navigator) {
    if (type === "success") (navigator as Navigator).vibrate(40);
    else if (type === "error") (navigator as Navigator).vibrate([80, 40, 80]);
  }
}

export const toast = {
  success: (m: string, d?: number) => push("success", m, d),
  error: (m: string, d?: number) => push("error", m, d ?? 4500),
  info: (m: string, d?: number) => push("info", m, d),
  warning: (m: string, d?: number) => push("warning", m, d),
};

// 全站 toast container（root layout 掛一次就好）
export function ToastContainer() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    const fn = (arr: ToastItem[]) => setList(arr);
    listeners.push(fn);
    return () => { listeners = listeners.filter(f => f !== fn); };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      {list.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur transition-all ${
            t.type === "success" ? "border-green-500/40 bg-green-950/90 text-green-100"
              : t.type === "error" ? "border-red-500/40 bg-red-950/90 text-red-100"
              : t.type === "warning" ? "border-orange-500/40 bg-orange-950/90 text-orange-100"
              : "border-blue-500/40 bg-blue-950/90 text-blue-100"
          }`}
          style={{ animation: "toastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        >
          <span className="text-base shrink-0">
            {t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}
          </span>
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes toastIn {
          0% { transform: translateY(-16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
