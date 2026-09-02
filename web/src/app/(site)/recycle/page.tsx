import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { RecycleSearch } from "./recycle-search";
import { RelatedReading, PRESET_LINKS } from "@/components/related-reading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "二手機回收估價 — iPhone・iPad・MacBook 高價收購",
  description: "i時代提供 iPhone、iPad、MacBook、Switch、Dyson 二手機高價回收，每日更新行情，現場現金交易，板橋江子翠。",
};

// 回收價每天 02:00 cron 更新，不需要每個請求都重算。
// 改用 ISR：CDN 直接回快取，只有每小時第一個請求會重新產生。
export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  phone: "手機",
  tablet: "平板",
  laptop_pro: "MacBook Pro",
  laptop_air: "MacBook Air",
  desktop: "桌機",
  console: "遊戲主機",
  dyson: "Dyson",
  earphone: "AirPods",
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

  // 超過這個天數沒對到市場行情，就不再把舊價當現價顯示，改導 LINE 專人估價。
  // 掛掉的爬蟲曾讓 4 月的價格在站上顯示了 4 個月，這道防線要獨立於爬蟲是否健康。
  const STALE_DAYS = 14;
  const staleBefore = Date.now() - STALE_DAYS * 86400_000;

  // 手機／平板／筆電的回收價一定要綁容量才有意義 —— 同一支 iPhone 128GB 與 1TB 差好幾千，
  // 只寫機型不寫容量的報價不但無法參考，還會出現「無容量列的價格高於所有容量版本」這種矛盾。
  // （有些來源只提供不分容量的基礎機型報價，就是這些列的來源。）
  // AirPods / Dyson / 遊戲主機本來就沒有容量規格，不套這個規則。
  const STORAGE_REQUIRED = new Set(["phone", "tablet", "laptop_pro", "laptop_air", "desktop"]);
  const visible = prices.filter(
    p => !STORAGE_REQUIRED.has(p.category) || !!p.storage,
  );

  const freshCount = visible.filter(p => p.lastUpdatedAt.getTime() >= staleBefore).length;

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
          收錄 {visible.length} 個機型，其中 {freshCount} 個為 {STALE_DAYS} 天內行情．
          {lastUpdated && (
            <>最後更新 {new Date(lastUpdated).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</>
          )}
        </p>
      </div>

      {visible.length === 0 ? (
        <NoData />
      ) : (
        <RecycleSearch
          prices={visible.map(p => ({
            id: p.id,
            category: p.category,
            categoryLabel: CATEGORY_LABELS[p.category] || p.category,
            brand: p.brand,
            modelName: p.modelName,
            storage: p.storage || "",
            variant: p.variant || "",
            minPrice: p.minPrice!,
            isStale: p.lastUpdatedAt.getTime() < staleBefore,
            updatedLabel: p.lastUpdatedAt.toLocaleDateString("zh-TW", {
              timeZone: "Asia/Taipei", month: "numeric", day: "numeric",
            }),
          }))}
          categories={CATEGORY_LABELS}
          brands={Array.from(new Set(visible.map(p => p.brand))).sort()}
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

      <RelatedReading links={PRESET_LINKS.fromRecycle} />
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
