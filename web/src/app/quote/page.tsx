import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "維修報價 — 透明價目 全機型支援",
  description: `${SITE.name}提供 iPhone、iPad、MacBook、Samsung、Switch、Dyson 等全品牌維修透明報價，板橋現場維修，當日完工。`,
};

export const dynamic = "force-dynamic";

const FALLBACK_BRANDS = [
  { id: 1, slug: "apple", name: "Apple", nameZh: "蘋果", _count: { models: 80 } },
  { id: 2, slug: "samsung", name: "Samsung", nameZh: "三星", _count: { models: 110 } },
  { id: 3, slug: "google", name: "Google", nameZh: "Google", _count: { models: 30 } },
  { id: 4, slug: "sony", name: "Sony", nameZh: "索尼", _count: { models: 35 } },
  { id: 5, slug: "asus", name: "ASUS", nameZh: "華碩", _count: { models: 40 } },
  { id: 6, slug: "oppo", name: "OPPO", nameZh: "OPPO", _count: { models: 50 } },
  { id: 7, slug: "xiaomi", name: "Xiaomi", nameZh: "小米", _count: { models: 60 } },
  { id: 8, slug: "huawei", name: "Huawei", nameZh: "華為等", _count: { models: 70 } },
  { id: 9, slug: "dyson", name: "Dyson", nameZh: "Dyson", _count: { models: 15 } },
  { id: 10, slug: "nintendo", name: "Nintendo", nameZh: "任天堂", _count: { models: 5 } },
];

async function getBrands() {
  try {
    return await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { models: true } } },
    });
  } catch {
    return FALLBACK_BRANDS;
  }
}

export default async function QuoteIndex() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">維修報價</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          選擇品牌 → 機型 → 維修項目，即時看到完整報價
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/quote/${b.slug}`}
            className="group flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition hover:border-[var(--gold)]"
          >
            <span className="font-serif text-2xl text-[var(--gold)] transition group-hover:text-[var(--gold-bright)]">
              {b.name}
            </span>
            <span className="mt-1 text-sm text-[var(--fg)]">{b.nameZh}</span>
            <span className="mt-3 text-xs text-[var(--fg-muted)]">
              {b._count.models} 個機型
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center">
        <p className="text-sm text-[var(--fg-muted)]">
          找不到您的機型？歡迎來電 <a href={`tel:${SITE.phoneRaw}`} className="text-[var(--gold)]">{SITE.phone}</a> 或 <a href={SITE.lineAddUrl} className="text-[var(--gold)]">加 LINE {SITE.lineId}</a> 詢問
        </p>
      </div>
    </div>
  );
}
