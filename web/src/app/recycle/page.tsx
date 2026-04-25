import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { RecycleSearch } from "./recycle-search";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "二手機回收估價 — iPhone・iPad・MacBook 高價收購",
  description: "i時代提供 iPhone、iPad、MacBook、Switch、Dyson 二手機高價回收，每日更新行情，現場現金交易，板橋江子翠。",
};

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  phone: "手機",
  tablet: "平板",
  laptop_pro: "MacBook Pro",
  laptop_air: "MacBook Air",
  desktop: "桌機",
  console: "遊戲主機",
  dyson: "Dyson",
};

export default async function RecyclePage() {
  let prices: Array<{
    id: number;
    modelKey: string;
    category: string;
    brand: string;
    modelName: string;
    storage: string | null;
    variant: string | null;
    minPrice: number | null;
    lastUpdatedAt: Date;
  }> = [];

  try {
    prices = await prisma.recyclePrice.findMany({
      where: { isAvailable: true, minPrice: { not: null } },
      orderBy: [{ category: "asc" }, { minPrice: "desc" }],
      select: {
        id: true,
        modelKey: true,
        category: true,
        brand: true,
        modelName: true,
        storage: true,
        variant: true,
        minPrice: true,
        lastUpdatedAt: true,
      },
    });
  } catch (e) {
    console.error("Failed to load recycle prices:", e);
  }

  const lastUpdated = prices.length > 0
    ? prices.reduce((max, p) => p.lastUpdatedAt > max ? p.lastUpdatedAt : max, prices[0].lastUpdatedAt)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">二手機回收估價</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg)]">
          每日自動比對市場行情．保證高於市場
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          目前收錄 {prices.length} 個機型．
          {lastUpdated && (
            <>更新於 {new Date(lastUpdated).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</>
          )}
        </p>
      </div>

      {prices.length === 0 ? (
        <NoData />
      ) : (
        <RecycleSearch
          prices={prices.map(p => ({
            id: p.id,
            category: p.category,
            categoryLabel: CATEGORY_LABELS[p.category] || p.category,
            brand: p.brand,
            modelName: p.modelName,
            storage: p.storage || "",
            variant: p.variant || "",
            minPrice: p.minPrice!,
          }))}
          categories={CATEGORY_LABELS}
          brands={Array.from(new Set(prices.map(p => p.brand))).sort()}
        />
      )}

      {/* CTA */}
      <div className="mt-12 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6 text-center">
        <p className="font-serif text-lg text-[var(--gold)]">確認回收？</p>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          帶機到店現場估價，現場驗機現金交易．或先 LINE 預約寄送
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-6 py-3 text-sm">
            LINE 預約回收
          </a>
          <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-6 py-3 text-sm">
            來電 {SITE.phone}
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--fg-muted)]">
        ＊ 顯示為基準回收價，最終價格依機況、配件完整度現場核定．市場行情每日更新
      </p>
    </div>
  );
}

function NoData() {
  return (
    <div className="mt-12 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-10 text-center">
      <p className="font-serif text-xl text-[var(--gold)]">回收價系統建置中</p>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        目前可直接透過 LINE 或電話詢問即時回收價（不到 5 分鐘回覆）
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-6 py-3 text-sm">
          LINE 詢問回收價
        </a>
        <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-6 py-3 text-sm">
          來電 {SITE.phone}
        </a>
      </div>
    </div>
  );
}
