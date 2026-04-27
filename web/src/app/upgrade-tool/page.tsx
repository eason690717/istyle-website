import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { UpgradeForm } from "./upgrade-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "換機決策器 — 修還是換？",
  description: "輸入您的手機型號 + 故障，30 秒內告訴你維修費 vs 二手回收價 vs 推薦下一台．省錢決策一次看完",
  alternates: { canonical: `${SITE.url}/upgrade-tool` },
};

export default async function UpgradeToolPage() {
  // 載入所有 brands + 機型給選單
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      models: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, name: true },
      },
    },
  });

  // 推薦商品（最熱賣 / 最新）
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
    select: { id: true, slug: true, name: true, imageUrl: true, price: true },
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--gold)] text-3xl">
          ⚖️
        </div>
        <h1 className="mt-4 font-serif text-3xl text-[var(--gold)] md:text-4xl">換機決策器</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          修還是換？輸入您的手機，30 秒幫你算清楚
        </p>
      </header>

      <UpgradeForm brands={brands.map(b => ({
        id: b.id,
        slug: b.slug,
        name: b.nameZh || b.name,
        models: b.models,
      }))} />

      <section className="mt-10">
        <h2 className="font-serif text-xl text-[var(--gold)]">如果決定換新</h2>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">門市精選保護周邊 / 二手機，配新機剛剛好</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {products.map(p => (
            <Link key={p.id} href={`/shop/${p.slug}`} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--gold)]">
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />}
              <div className="p-3">
                <p className="truncate text-sm">{p.name}</p>
                <p className="mt-1 text-xs text-[var(--gold-bright)]">NT$ {p.price.toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
