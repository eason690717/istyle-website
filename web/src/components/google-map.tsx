import { SITE } from "@/lib/site-config";

// Google Maps 嵌入 — 加在 about / 首頁
// 用 Google Maps 公開嵌入 URL（不需 API key）
export function GoogleMap({ height = 360 }: { height?: number }) {
  // 預設搜尋字串（後台可覆寫成具體 placeId）
  const q = encodeURIComponent(`${SITE.name} ${SITE.address.street}`);
  const src = `https://maps.google.com/maps?q=${q}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${SITE.name} 地圖位置`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-elevated)] px-4 py-3 text-sm">
        <div>
          <div className="font-serif text-[var(--gold)]">{SITE.name}</div>
          <div className="text-xs text-[var(--fg-muted)]">{SITE.address.street}</div>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold-outline rounded-full px-4 py-1.5 text-xs"
          >
            Google 導航
          </a>
          <a
            href={`tel:${SITE.phoneRaw}`}
            className="btn-gold rounded-full px-4 py-1.5 text-xs"
          >
            來電 {SITE.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
