// 相關閱讀區塊 — 通用，每頁底部加上會降低跳出率
// 用法：<RelatedReading links={[{href:'/quote', label:'維修報價'}]} />
import Link from "next/link";

interface RelatedLink { href: string; label: string; desc?: string; icon?: string; }

export function RelatedReading({ links, title = "你可能也想看" }: { links: RelatedLink[]; title?: string }) {
  if (links.length === 0) return null;
  return (
    <section className="mt-12 border-t border-[var(--border)] pt-8">
      <h2 className="text-center font-serif text-base text-[var(--fg-muted)] md:text-lg">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5"
          >
            {l.icon && <span className="text-2xl shrink-0">{l.icon}</span>}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--fg)] group-hover:text-[var(--gold)]">{l.label}</div>
              {l.desc && <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{l.desc}</p>}
            </div>
            <span className="text-[var(--gold-soft)] opacity-0 transition group-hover:opacity-100">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// 預設常用組合（給各頁面快速套用）
export const PRESET_LINKS = {
  fromQuote: [
    { href: "/recycle", label: "二手機回收估價", desc: "查您手機目前回收行情", icon: "♻️" },
    { href: "/upgrade-tool", label: "修還是換？決策器", desc: "30 秒幫你算划算度", icon: "⚖️" },
    { href: "/cases", label: "真實維修案例", desc: "看師傅怎麼修", icon: "📋" },
  ],
  fromCases: [
    { href: "/quote", label: "查您機型維修報價", desc: "10,000+ 透明價目", icon: "📋" },
    { href: "/booking", label: "線上預約來店", desc: "LINE 預約折 $100", icon: "📅" },
    { href: "/courses", label: "想自己學維修？", desc: "iPhone / Android 班", icon: "🎓" },
  ],
  fromBlog: [
    { href: "/quote", label: "立即查維修報價", desc: "10,000+ 機型項目", icon: "📋" },
    { href: "/upgrade-tool", label: "換機決策器", desc: "修還是換 30 秒算清", icon: "⚖️" },
    { href: "/cases", label: "真實案例集", desc: "看實際維修流程", icon: "📋" },
  ],
  fromService: [
    { href: "/quote", label: "查您機型精準價", desc: "選擇品牌型號", icon: "📋" },
    { href: "/booking", label: "預約來店", desc: "LINE 折 $100", icon: "📅" },
    { href: "/local", label: "服務區域", desc: "雙北 27 區", icon: "📍" },
  ],
  fromRecycle: [
    { href: "/upgrade-tool", label: "修還是換決策器", desc: "對比維修費 vs 賣掉", icon: "⚖️" },
    { href: "/quote", label: "維修報價", desc: "也許修一下就好", icon: "📋" },
    { href: "/booking", label: "預約到店面交", desc: "現場估價更準", icon: "📅" },
  ],
};
