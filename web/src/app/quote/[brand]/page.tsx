import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { displayPrice, formatTwd } from "@/lib/pricing";
import type { Metadata } from "next";

type Params = { brand: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } }).catch(() => null);
  if (!brand) return { title: "找不到品牌" };
  return {
    title: `${brand.name} 維修報價 — 全機型透明價目`,
    description: `${SITE.name}提供 ${brand.name} 全機型維修透明報價：螢幕、電池、鏡頭、主機板等。板橋現場維修，當日完工`,
  };
}

export default async function BrandPage({ params }: { params: Promise<Params> }) {
  const { brand: brandSlug } = await params;
  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    include: {
      models: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          prices: {
            where: { isAvailable: true },
            include: { item: true },
          },
        },
      },
    },
  }).catch(() => null);

  if (!brand) notFound();

  const sections = new Map<string, typeof brand.models>();
  for (const m of brand.models) {
    const key = m.section || brand.name;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(m);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <nav className="mb-6 text-xs text-[var(--fg-muted)]">
        <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
        {" / "}
        <Link href="/quote" className="hover:text-[var(--gold)]">維修報價</Link>
        {" / "}
        <span className="text-[var(--fg)]">{brand.name}</span>
      </nav>

      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">{brand.name} 維修報價</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          所有機型 × 所有維修項目．透明價目．保固 3 個月．當日完工
        </p>
        <p className="mt-2 text-xs text-[var(--gold-soft)] md:hidden">
          ← 表格可左右滑動查看 →
        </p>
      </div>

      <div className="mt-10 space-y-12">
        {Array.from(sections.entries()).map(([sectionName, models]) => (
          <PriceMatrix key={sectionName} sectionName={sectionName} models={models} brandSlug={brand.slug} />
        ))}
      </div>

      {/* 推薦說明 */}
      <div className="mt-6 rounded-lg border border-[var(--gold)] bg-[var(--bg-elevated)] p-4 text-center text-sm">
        <p className="text-[var(--gold)]">
          <span className="font-semibold">★ 推薦「認證電池」</span> — 容量、性能與原廠相同，價格更實惠，同樣保固 6 個月
        </p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          認證電池由原廠晶片＋同等級電芯組成，通過 KC / CE / BSMI 認證，是高 CP 值首選
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--fg-muted)]">
        ＊ 所有報價含工資與零件．實際維修以現場檢測為準（泡水/重摔/二修另議）．「—」表示該機型無此服務
      </p>

      <div className="mt-10 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6 text-center">
        <p className="font-serif text-lg text-[var(--gold)]">找不到您的機型？</p>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">直接聯絡我們，最快 5 分鐘內回覆</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href={`tel:${SITE.phoneRaw}`} className="btn-gold rounded-full px-6 py-3 text-sm">來電 {SITE.phone}</a>
          <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">LINE 詢問</a>
        </div>
      </div>
    </div>
  );
}

// 推薦項目判定：含「認證」的維修項目為高利潤，視覺強調
function isRecommendedItem(name: string): boolean {
  return /認證/.test(name);
}

function PriceMatrix({
  sectionName,
  models,
  brandSlug,
}: {
  sectionName: string;
  models: Array<{
    id: number;
    name: string;
    slug: string;
    prices: Array<{
      itemId: number;
      manualOverride: number | null;
      calculatedPrice: number | null;
      item: { id: number; name: string; sortOrder: number };
    }>;
  }>;
  brandSlug: string;
}) {
  // 找出此 section 出現過的所有 item
  const itemMap = new Map<number, { id: number; name: string; sortOrder: number }>();
  for (const m of models) {
    for (const p of m.prices) {
      if (!itemMap.has(p.itemId)) itemMap.set(p.itemId, p.item);
    }
  }
  // 推薦的項目（認證）排前面，其餘按 sortOrder
  const items = Array.from(itemMap.values()).sort((a, b) => {
    const aRec = isRecommendedItem(a.name) ? -1 : 0;
    const bRec = isRecommendedItem(b.name) ? -1 : 0;
    if (aRec !== bRec) return aRec - bRec;
    return a.sortOrder - b.sortOrder;
  });

  const priceLookup = new Map<string, number | null>();
  for (const m of models) {
    for (const p of m.prices) {
      priceLookup.set(`${m.id}|${p.itemId}`, displayPrice(p));
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)]">
      {/* Section title bar — 金色 header 強烈視覺 */}
      <div className="border-b border-[var(--gold)] bg-gradient-to-r from-[#1a1410] via-[#241b13] to-[#1a1410] px-5 py-3 text-center">
        <h2 className="font-serif text-lg text-[var(--gold)] md:text-xl">
          {sectionName}
        </h2>
      </div>

      {/* 表格 — 橫向可捲動，行交替深淺，機型欄 sticky */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#1f1810] text-[var(--gold)]">
              <th className="sticky left-0 z-20 min-w-[140px] bg-[#1f1810] px-3 py-3 text-center font-serif font-medium md:min-w-[180px]">
                機型
              </th>
              {items.map((it) => {
                const rec = isRecommendedItem(it.name);
                return (
                  <th
                    key={it.id}
                    className={`whitespace-nowrap border-l border-[var(--border-soft)] px-3 py-3 text-center font-medium ${
                      rec ? "bg-[var(--gold)] text-black" : ""
                    }`}
                  >
                    {rec && <span className="mr-1 text-[10px]">★ 推薦</span>}
                    {it.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {models.map((m, idx) => (
              <tr
                key={m.id}
                className={`group transition ${
                  idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
                } hover:bg-[#241c12]`}
              >
                <td
                  className={`sticky left-0 z-10 min-w-[140px] border-r border-[var(--border)] px-3 py-3 text-center font-medium text-[var(--fg-strong)] md:min-w-[180px] ${
                    idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
                  } group-hover:bg-[#241c12]`}
                >
                  <Link
                    href={`/quote/${brandSlug}/${m.slug}`}
                    className="block hover:text-[var(--gold)]"
                  >
                    {m.name}
                  </Link>
                </td>
                {items.map((it) => {
                  const price = priceLookup.get(`${m.id}|${it.id}`);
                  const rec = isRecommendedItem(it.name);
                  return (
                    <td
                      key={it.id}
                      className={`whitespace-nowrap border-l border-[var(--border-soft)] px-3 py-3 text-center font-mono ${
                        rec ? "bg-[var(--gold)]/8" : ""
                      }`}
                    >
                      {price != null ? (
                        <span className={rec ? "font-semibold text-[var(--gold)]" : "text-[var(--fg)]"}>
                          {price.toLocaleString("zh-TW")}
                        </span>
                      ) : (
                        <span className="text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
