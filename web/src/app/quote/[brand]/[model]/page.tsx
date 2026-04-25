import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { displayPrice, formatTwd, TIER_DESCRIPTIONS, TIER_LABELS } from "@/lib/pricing";
import { findRecyclePricesForModel } from "@/lib/model-helpers";
import { AddToCartButton } from "@/components/cart-button";
import type { Metadata } from "next";

type Params = { brand: string; model: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand: brandSlug, model: modelSlug } = await params;
  const m = await prisma.deviceModel.findUnique({
    where: { slug: modelSlug },
    include: { brand: true },
  }).catch(() => null);
  if (!m) return { title: "找不到機型" };
  return {
    title: `${m.name} 維修報價 — ${m.brand.name}`,
    description: `${m.brand.name} ${m.name} 螢幕、電池、鏡頭、主機板等所有維修項目透明報價．${SITE.name}板橋現場維修．當日完工`,
  };
}

export default async function ModelPage({ params }: { params: Promise<Params> }) {
  const { brand: brandSlug, model: modelSlug } = await params;

  const model = await prisma.deviceModel.findUnique({
    where: { slug: modelSlug },
    include: {
      brand: true,
      prices: {
        where: { isAvailable: true },
        include: { item: true },
      },
    },
  }).catch(() => null);

  if (!model || model.brand.slug !== brandSlug) notFound();

  // 同時找該機型的二手回收價（fuzzy match）
  const recyclePrices = await findRecyclePricesForModel(model.name);

  // 把同一 item 的 STANDARD / OEM 兩 tier 配成一組
  type ItemRow = {
    itemId: number;
    itemName: string;
    description?: string | null;
    warrantyMonths?: number | null;
    standard?: typeof model.prices[number];
    oem?: typeof model.prices[number];
  };
  const itemMap = new Map<number, ItemRow>();
  for (const p of model.prices) {
    const row = itemMap.get(p.itemId) ?? {
      itemId: p.itemId,
      itemName: p.item.name,
      description: p.item.description,
      warrantyMonths: p.item.warrantyMonths,
    };
    if (p.tier === "STANDARD") row.standard = p;
    if (p.tier === "OEM") row.oem = p;
    itemMap.set(p.itemId, row);
  }
  const rows = Array.from(itemMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName, "zh-TW"));

  // Service JSON-LD（GEO）
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${model.brand.name} ${model.name} 維修服務`,
    provider: { "@type": "LocalBusiness", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "City", name: "新北市板橋區" },
    offers: rows.flatMap(r => [
      r.standard && {
        "@type": "Offer",
        name: `${r.itemName}（標準版）`,
        price: displayPrice(r.standard) ?? 0,
        priceCurrency: "TWD",
      },
      r.oem && {
        "@type": "Offer",
        name: `${r.itemName}（原廠版）`,
        price: displayPrice(r.oem) ?? 0,
        priceCurrency: "TWD",
      },
    ]).filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <nav className="mb-6 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
          {" / "}
          <Link href="/quote" className="hover:text-[var(--gold)]">維修報價</Link>
          {" / "}
          <Link href={`/quote/${model.brand.slug}`} className="hover:text-[var(--gold)]">{model.brand.name}</Link>
          {" / "}
          <span className="text-[var(--fg)]">{model.name}</span>
        </nav>

        <div className="text-center">
          <p className="text-sm text-[var(--gold-soft)]">{model.brand.name} {model.brand.nameZh}</p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--gold)] md:text-4xl">
            {model.name}
          </h1>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            {rows.length} 項可維修服務．保固 3 個月．當日取件
          </p>
        </div>

        {/* Tier 說明 */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <TierLegend tier="STANDARD" />
          <TierLegend tier="OEM" />
        </div>

        {/* 報價表格 + 加入訂單按鈕 */}
        <div className="mt-10 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-soft)]">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-[var(--fg)]">維修項目</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--gold-soft)]">標準版</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--gold)]">原廠版</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map(r => {
                const stdPrice = r.standard ? displayPrice(r.standard) : null;
                const oemPrice = r.oem ? displayPrice(r.oem) : null;
                return (
                  <tr key={r.itemId} className="transition hover:bg-[var(--bg-soft)]">
                    <td className="px-4 py-3 font-medium text-[var(--fg)]">{r.itemName}</td>
                    <td className="px-4 py-3 text-right">
                      {stdPrice ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-[var(--fg)]">{formatTwd(stdPrice)}</span>
                          <AddToCartButton
                            modelId={model.id}
                            modelSlug={model.slug}
                            modelName={model.name}
                            brandSlug={model.brand.slug}
                            brandName={model.brand.name}
                            itemId={r.itemId}
                            itemName={r.itemName}
                            tier="STANDARD"
                            tierLabel="標準版"
                            unitPrice={stdPrice}
                          />
                        </div>
                      ) : <span className="text-[var(--fg-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {oemPrice ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-[var(--gold)]">{formatTwd(oemPrice)}</span>
                          <AddToCartButton
                            modelId={model.id}
                            modelSlug={model.slug}
                            modelName={model.name}
                            brandSlug={model.brand.slug}
                            brandName={model.brand.name}
                            itemId={r.itemId}
                            itemName={r.itemName}
                            tier="OEM"
                            tierLabel="原廠版"
                            unitPrice={oemPrice}
                          />
                        </div>
                      ) : <span className="text-[var(--fg-muted)]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-[var(--fg-muted)]">
          ＊ 報價含工資與零件，無隱藏費用．實際維修以現場檢測為準，特殊狀況（泡水/重摔/二修）另行報價
        </p>

        {/* 二手回收價（如果有 match） */}
        {recyclePrices.length > 0 && (
          <div className="mt-10 rounded-xl border border-[var(--gold-soft)]/40 bg-[var(--bg-elevated)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-[var(--gold)]">這台機型也可以回收</h2>
              <Link href="/recycle" className="text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">看全部回收 →</Link>
            </div>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">不修了？換錢更划算！每日比對市場行情</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {recyclePrices.slice(0, 6).map(r => (
                <div key={r.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[var(--fg)]">{r.storage || "—"} {r.variant || ""}</span>
                    <span className="font-mono text-base font-semibold text-[var(--gold)]">
                      NT$ {(r.minPrice || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-5 py-2 text-xs">
                LINE 詢問回收（現場現金交易）
              </a>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="glass-card mt-10 rounded-xl p-6 text-center">
          <p className="text-gold-gradient font-serif text-xl">立即預約維修</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            到店維修最快 30 分鐘完工，當日取件
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={`/booking?modelId=${model.id}`}
              className="btn-gold rounded-full px-6 py-3 text-sm"
            >
              線上預約
            </Link>
            <a
              href={`tel:${SITE.phoneRaw}`}
              className="btn-gold-outline rounded-full px-6 py-3 text-sm"
            >
              來電 {SITE.phone}
            </a>
            <a
              href={SITE.lineAddUrl}
              className="btn-gold-outline rounded-full px-6 py-3 text-sm"
            >
              LINE 詢問
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function TierLegend({ tier }: { tier: "STANDARD" | "OEM" }) {
  const isOem = tier === "OEM";
  return (
    <div className={`refined-card p-4 ${isOem ? "border-[var(--gold)] shadow-[0_0_24px_rgba(201,169,110,0.15)]" : ""}`}>
      <div className={`font-serif text-base ${isOem ? "text-gold-gradient" : "text-[var(--gold-soft)]"}`}>
        {TIER_LABELS[tier]}
      </div>
      <p className="mt-2 text-xs text-[var(--fg-muted)] leading-relaxed">
        {TIER_DESCRIPTIONS[tier]}
      </p>
    </div>
  );
}
