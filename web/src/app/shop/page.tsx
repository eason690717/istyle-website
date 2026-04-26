import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商城 — 手機配件、保護貼、充電線",
  description: `${SITE.name}．iPhone / Android / MacBook 配件、保護貼、充電線、行動電源．14 年技術選品．7-11 取貨`,
};

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  case: "手機殼",
  "screen-protector": "螢幕保護貼",
  charger: "充電配件",
  cable: "傳輸線",
  power: "行動電源",
  audio: "音訊配件",
  accessory: "其他配件",
  "used-phone": "二手機",
  tool: "維修工具",
  other: "其他",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const activeCategory = sp.category || "all";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(activeCategory !== "all" ? { category: activeCategory } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  }).catch(() => []);

  // 計算各類別數
  const allActive = activeCategory === "all"
    ? products
    : await prisma.product.findMany({ where: { isActive: true }, select: { category: true } }).catch(() => []);
  const counts = new Map<string, number>();
  for (const p of allActive) counts.set(p.category, (counts.get(p.category) || 0) + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">商城</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg)]">
          14 年技術選品．保護貼／手機殼／充電配件／二手機
        </p>
      </div>

      {/* 類別篩選 */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/shop"
          className={`chip-refined ${activeCategory === "all" ? "active" : ""}`}
        >
          全部 <span className="count">({allActive.length})</span>
        </Link>
        {Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
          <Link
            key={cat}
            href={`/shop?category=${cat}`}
            className={`chip-refined ${activeCategory === cat ? "active" : ""}`}
          >
            {CATEGORY_LABELS[cat] || cat} <span className="count">({n})</span>
          </Link>
        ))}
      </div>

      {/* 商品列表 */}
      {products.length === 0 ? (
        <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center">
          <div className="text-5xl">🛍️</div>
          <p className="mt-4 font-serif text-lg text-[var(--gold)]">商品上架中</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">第一批商品準備中，先透過 LINE 詢問現貨</p>
          <a href={SITE.lineAddUrl} className="btn-gold mt-4 inline-block rounded-full px-6 py-2 text-sm">LINE 詢問</a>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map(p => (
            <Link key={p.id} href={`/shop/${p.slug}`} className="refined-card group block overflow-hidden">
              <div className="relative aspect-square bg-[var(--bg-soft)]">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.name} fill className="object-cover transition group-hover:scale-105" sizes="300px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-[var(--fg-muted)]">📦</div>
                )}
                {p.isFeatured && (
                  <span className="absolute left-2 top-2 rounded bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-black">★ 精選</span>
                )}
                {p.comparePrice && p.comparePrice > p.price && (
                  <span className="absolute right-2 top-2 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    -{Math.round((1 - p.price / p.comparePrice) * 100)}%
                  </span>
                )}
                {p.stock === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="rounded bg-zinc-700 px-3 py-1 text-sm text-white">缺貨</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-[10px] text-[var(--gold-soft)]">{CATEGORY_LABELS[p.category] || p.category}</div>
                <h2 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-[var(--fg)] group-hover:text-[var(--gold)]">
                  {p.name}
                </h2>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-lg font-semibold text-[var(--gold)]">NT$ {p.price.toLocaleString()}</span>
                  {p.comparePrice && p.comparePrice > p.price && (
                    <span className="text-xs text-[var(--fg-muted)] line-through">NT$ {p.comparePrice.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
