import { SITE } from "@/lib/site-config";
import { DiagnoseTool } from "./diagnose-tool";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "免費自助診斷 — 手機問題快速檢測 + 維修報價",
  description: `${SITE.name}免費自助診斷工具：選擇症狀 → 立即知道可能原因 + 維修報價，板橋江子翠 14 年技術經驗。`,
};

export default function DiagnosePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">免費自助診斷</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg)]">
          選擇您手機的症狀 → 立即知道可能原因與維修費用
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          14 年維修經驗整理．不確定請直接 LINE 詢問
        </p>
      </div>

      <div className="mt-10">
        <DiagnoseTool />
      </div>
    </div>
  );
}
