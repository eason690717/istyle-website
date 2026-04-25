import { SITE } from "@/lib/site-config";
import { BookingForm } from "./booking-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "線上預約 — LINE 預約折 $100 折扣",
  description: `${SITE.name}線上預約．推薦透過 LINE 預約現折 $100．或填寫簡易表單，板橋江子翠 14 年技術經驗。`,
};

const LINE_PROMPT = `i時代預約：

維修項目：
機型：
希望時段：
姓名：
聯絡電話：`;

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">線上預約</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg)]">
          維修、二手機回收估價、檢測、課程諮詢，皆可預約
        </p>
      </div>

      {/* PRIMARY：LINE 預約 — 大鉤子 */}
      <div className="mt-10 rounded-2xl border-2 border-[var(--gold)] bg-gradient-to-b from-[#1a1410] to-[var(--bg-elevated)] p-7 text-center">
        <div className="mx-auto inline-flex items-center justify-center rounded-full bg-[#06C755]/15 px-4 py-1 text-xs text-[#06C755]">
          ⭐ 推薦方式
        </div>
        <h2 className="mt-3 font-serif text-2xl text-[var(--gold)]">
          LINE 預約折 $100
        </h2>
        <p className="mt-2 text-sm text-[var(--fg)]">
          加入 LINE 後出示預約訊息，<strong className="text-[var(--gold)]">維修費用直接折抵 $100</strong>
        </p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          回覆時間 12:00 – 21:00．自動回覆內附完整預約格式
        </p>

        <a
          href={SITE.lineAddUrl}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#06C755] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[#05a548]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          加入 LINE 預約 {SITE.lineId}
        </a>

        <details className="mt-5 text-left">
          <summary className="cursor-pointer text-xs text-[var(--fg-muted)] underline">
            預約格式範本（複製貼上即可）
          </summary>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-[var(--bg-soft)] p-3 text-xs text-[var(--fg)]">
{LINE_PROMPT}
          </pre>
        </details>
      </div>

      {/* SECONDARY：來電 */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
        <p className="text-xs text-[var(--fg-muted)]">不方便用 LINE？</p>
        <a
          href={`tel:${SITE.phoneRaw}`}
          className="btn-gold-outline mt-2 inline-block rounded-full px-6 py-2 text-sm"
        >
          ☎ 直接撥打 {SITE.phone}
        </a>
        <p className="mt-1 text-[10px] text-[var(--fg-muted)]">每日 11:00 – 20:00</p>
      </div>

      {/* TERTIARY：填表單（折疊） */}
      <details className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between text-sm">
          <span className="text-[var(--fg)]">⌨ 想用網頁表單預約？</span>
          <span className="text-xs text-[var(--gold)] group-open:rotate-180">展開 ▾</span>
        </summary>
        <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="mb-4 text-xs text-[var(--fg-muted)]">
            ※ 表單預約無法享受 $100 折扣．如方便請優先使用 LINE
          </p>
          <BookingForm />
        </div>
      </details>
    </div>
  );
}
