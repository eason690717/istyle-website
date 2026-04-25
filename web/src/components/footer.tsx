import Link from "next/link";
import { SITE } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg-elevated)] py-10 text-sm text-[var(--fg-muted)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-4">
        <div>
          <div className="font-serif text-lg text-[var(--gold)]">{SITE.name}</div>
          <p className="mt-2 text-xs leading-relaxed">
            {SITE.legalName}
            <br />
            2011 年成立．累積維修 {SITE.repairsCount} 台
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-[var(--fg)]">服務</h3>
          <ul className="mt-3 space-y-2">
            <li><Link href="/quote" className="hover:text-[var(--gold)]">維修報價</Link></li>
            <li><Link href="/recycle" className="hover:text-[var(--gold)]">二手回收</Link></li>
            <li><Link href="/booking" className="hover:text-[var(--gold)]">線上預約</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-[var(--fg)]">聯絡</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={`tel:${SITE.phoneRaw}`} className="hover:text-[var(--gold)]">
                電話 {SITE.phone}
              </a>
            </li>
            <li>
              <a href={SITE.lineAddUrl} className="hover:text-[var(--gold)]">
                LINE {SITE.lineId}
              </a>
            </li>
            <li>{SITE.address.street}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-[var(--fg)]">營業時間</h3>
          <ul className="mt-3 space-y-2">
            {SITE.businessHours.map((h) => (
              <li key={h.days}>
                {h.days === "Mon-Sun" ? "每日" : h.days} {h.open}–{h.close}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-[var(--border-soft)] px-4 pt-6 text-center text-xs">
        © {new Date().getFullYear()} {SITE.legalName}．All rights reserved.
      </div>
    </footer>
  );
}
