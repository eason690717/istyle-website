import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site-config";
import { HeaderSearch } from "./header-search";
import { CartButton } from "./cart-button";

const NAV = [
  { href: "/shop", label: "商城" },
  { href: "/quote", label: "維修報價" },
  { href: "/recycle", label: "二手回收" },
  { href: "/blog", label: "維修知識" },
  { href: "/booking", label: "線上預約" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="i時代 首頁">
          <Image
            src="/logo-icon.png"
            alt="i時代 手機維修專家"
            width={56}
            height={42}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-lg text-[var(--gold)] sm:text-xl">{SITE.name}</span>
            <span className="hidden text-[10px] tracking-widest text-[var(--fg-muted)] sm:block">
              {SITE.tagline}
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--fg)] transition hover:text-[var(--gold)]"
            >
              {item.label}
            </Link>
          ))}
          <HeaderSearch />
          <CartButton />
          <a
            href={`tel:${SITE.phoneRaw}`}
            className="btn-gold rounded-full px-4 py-2 text-sm"
          >
            預約來電
          </a>
        </nav>

        {/* Mobile：搜尋 + 購物車 + 電話 */}
        <div className="flex items-center gap-2 md:hidden">
          <HeaderSearch />
          <CartButton />
          <a
            href={`tel:${SITE.phoneRaw}`}
            className="btn-gold rounded-full px-3 py-2 text-xs"
            aria-label="撥打電話"
          >
            來電
          </a>
        </div>
      </div>

      {/* Mobile 底部導覽（簡單列出） */}
      <nav className="flex justify-around border-t border-[var(--border-soft)] bg-[var(--bg-elevated)] py-2 text-xs md:hidden">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[var(--fg-muted)] hover:text-[var(--gold)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
