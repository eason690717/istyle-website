// 促銷橫幅 — 全站頂部，可從 site-config 控制
// 用途：限時優惠、節慶活動、新功能宣告
import { SITE } from "@/lib/site-config";

const PROMO = {
  enabled: true,
  message: "🎉 LINE 預約現折 $100．認證電池價格更實惠．現場 30 分鐘完工",
  ctaLabel: "LINE 預約折 $100",
  ctaHref: SITE.lineAddUrl,
};

export function PromoBanner() {
  if (!PROMO.enabled) return null;
  return (
    <div className="border-b border-[var(--gold-soft)]/40 bg-gradient-to-r from-[#2a1f10] via-[#3d2c14] to-[#2a1f10] text-center text-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-2">
        <span className="text-[var(--gold-bright)]">{PROMO.message}</span>
        <a
          href={PROMO.ctaHref}
          className="rounded-full bg-[var(--gold)] px-3 py-0.5 text-xs font-semibold text-black hover:bg-[var(--gold-bright)]"
        >
          {PROMO.ctaLabel}
        </a>
      </div>
    </div>
  );
}
