"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "@/components/tracker";
import { SITE } from "@/lib/site-config";

const STORAGE_KEY = "istyle_exit_seen";
const COOLDOWN_HOURS = 24;

export function ExitIntent() {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen && Date.now() - Number(lastSeen) < COOLDOWN_HOURS * 3600_000) return;

    const onMouseLeave = (e: MouseEvent) => { if (e.clientY <= 0) trigger(); };
    let mobileArmed = false;
    const armMobile = () => {
      if (mobileArmed) return;
      mobileArmed = true;
      window.history.pushState({ exitTrap: true }, "");
    };
    const onPopstate = () => trigger();

    function trigger() {
      setShow(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      trackEvent("exit_intent_shown");
      cleanup();
    }
    function cleanup() {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("popstate", onPopstate);
    }

    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", onMouseLeave);
      if (/mobile|android|iphone/i.test(navigator.userAgent)) {
        armMobile();
        window.addEventListener("popstate", onPopstate);
      }
    }, 5000);

    return () => { clearTimeout(timer); cleanup(); };
  }, []);

  function close() {
    setClosing(true);
    setTimeout(() => { setShow(false); setClosing(false); }, 200);
  }

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      onClick={close}
    >
      <div
        className={`relative w-full max-w-md transition-all duration-300 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: closing ? "" : "exitPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* 金色光暈裝飾 */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--gold)]/30 via-transparent to-[var(--gold)]/20 blur-xl" />
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--gold)] via-[var(--gold-soft)]/40 to-[var(--gold)] opacity-60 blur" />

        {/* 主卡片 */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[#1a1410] via-[#0d0908] to-[#1a1410] p-7 shadow-2xl">
          {/* 角落裝飾 */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--gold)]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[var(--gold)]/10 blur-3xl" />

          {/* 關閉按鈕 */}
          <button
            onClick={close}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--fg-muted)] transition hover:bg-white/5 hover:text-[var(--fg)]"
            aria-label="關閉"
          >
            ✕
          </button>

          {/* 折扣 badge */}
          <div className="relative">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--gold)]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--gold-bright)]">限時優惠</span>
            </div>

            {/* 大數字 — 視覺主角 */}
            <div className="text-center">
              <div className="font-serif text-xs text-[var(--fg-muted)]">立即加 LINE 預約現折</div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="font-serif text-5xl font-bold text-[var(--gold)]">$100</span>
              </div>
              <div className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent" />
            </div>

            {/* 標題 */}
            <h2 className="mt-4 text-center font-serif text-2xl text-white">
              等等 · 別走
            </h2>
            <p className="mt-1 text-center text-[11px] text-[var(--fg-muted)]">
              {SITE.experienceYears()} 年技術經驗 · {SITE.repairsCount} 次維修經驗
            </p>

            {/* 信任點 */}
            <ul className="mt-5 space-y-1.5 text-xs text-[var(--fg)]">
              {[
                "現場 30 分鐘完工，急件當天好",
                "認證電池 / 螢幕，原廠等級品質",
                "不修不收費，透明報價",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-[10px] text-[var(--gold-bright)]">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            {/* 主 CTA */}
            <a
              href={SITE.lineAddUrl}
              onClick={() => trackEvent("exit_intent_line_clicked")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--gold)] via-[var(--gold-bright)] to-[var(--gold)] px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-[var(--gold)]/30 transition hover:shadow-xl hover:shadow-[var(--gold)]/40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.97 2 10.85c0 3.27 2.04 6.13 5.13 7.71.27.13.62.31.71.71.08.36.05.91 0 1.27 0 0-.09.66-.11.8-.04.23-.18.92.81.5 1-.42 5.39-3.18 7.36-5.45 1.36-1.49 2.1-3.4 2.1-5.54C22 5.97 17.52 2 12 2z"/></svg>
              加 LINE 領取 $100 折扣
            </a>

            {/* 次 CTA */}
            <a
              href={`tel:${SITE.phoneRaw}`}
              onClick={() => trackEvent("exit_intent_call_clicked")}
              className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--fg-muted)] transition hover:text-[var(--gold)]"
            >
              <span>📞</span>
              <span>或撥打 {SITE.phone}</span>
            </a>

            <button
              onClick={close}
              className="mt-3 block w-full text-center text-[10px] text-[var(--fg-muted)]/60 hover:text-[var(--fg-muted)]"
            >
              不用了，繼續逛
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes exitPopIn {
          0% { transform: scale(0.85) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
