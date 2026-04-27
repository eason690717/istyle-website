"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "@/components/tracker";
import { SITE } from "@/lib/site-config";

const STORAGE_KEY = "istyle_exit_seen";
const COOLDOWN_HOURS = 24; // 同一裝置 24 小時內不重複

export function ExitIntent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // cooldown
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen && Date.now() - Number(lastSeen) < COOLDOWN_HOURS * 3600_000) return;

    // 桌機：滑鼠移動到頂部離開頁面
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };
    // 行動：第一次按返回時觸發（push state，攔下一次 popstate）
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

    // 等使用者停留 5 秒以上才掛偵測，避免一進來就跳
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", onMouseLeave);
      // 只在移動裝置開啟 mobile trap，避免桌機被影響
      if (/mobile|android|iphone/i.test(navigator.userAgent)) {
        armMobile();
        window.addEventListener("popstate", onPopstate);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShow(false)}>
      <div
        className="glass-card relative w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 text-2xl text-[var(--fg-muted)] hover:text-[var(--fg)]"
          aria-label="關閉"
        >×</button>

        <div className="text-center">
          <div className="mb-3 text-5xl">⏸️</div>
          <h2 className="font-serif text-2xl text-[var(--gold)]">等等！別走</h2>
          <p className="mt-2 text-sm text-[var(--fg)]">
            加 LINE 預約現折 <span className="font-bold text-[var(--gold-bright)]">NT$100</span>
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            14 年技術經驗 · 透明報價 · 當日完工
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <a
              href={SITE.lineAddUrl}
              onClick={() => trackEvent("exit_intent_line_clicked")}
              className="btn-gold rounded-full py-3 text-sm font-semibold"
            >
              💬 加 LINE 領折扣
            </a>
            <a
              href={`tel:${SITE.phoneRaw}`}
              onClick={() => trackEvent("exit_intent_call_clicked")}
              className="rounded-full border border-[var(--border)] py-3 text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]"
            >
              或撥打 {SITE.phone}
            </a>
          </div>

          <button
            onClick={() => setShow(false)}
            className="mt-4 text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            算了，繼續逛
          </button>
        </div>
      </div>
    </div>
  );
}
