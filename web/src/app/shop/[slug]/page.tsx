import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { AddProductButton } from "@/components/cart-button";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug } }).catch(() => null);
  if (!p) return { title: "找不到商品" };
  return {
    title: p.metaTitle || p.name,
    description: p.metaDescription || p.description?.slice(0, 160) || `${SITE.name}．${p.name}`,
    openGraph: {
      title: p.name,
      description: p.description?.slice(0, 160) || "",
      images: p.imageUrl ? [{ url: p.imageUrl }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  }).catch(() => null);
  if (!product || !product.isActive) notFound();

  const hasVariants = product.variants.length > 0;
  // 取所有變體中最低售價當「起價」顯示
  const minVariantPrice = hasVariants
    ? Math.min(...product.variants.map(v => v.price))
    : null;
  const displayPrice = hasVariants && minVariantPrice ? minVariantPrice : product.price;
  const totalStock = hasVariants
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;

  // 同分類其他商品
  const related = await prisma.product.findMany({
    where: { category: product.category, isActive: true, id: { not: product.id } },
    take: 4,
    orderBy: { isFeatured: "desc" },
  }).catch(() => []);

  // Product JSON-LD（GEO）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    brand: { "@type": "Brand", name: product.brand || SITE.name },
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/shop/${product.slug}`,
      priceCurrency: "TWD",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      price: displayPrice,
      availability: totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
  // 上面 jsonLd 已經包含一次 price/availability，移除重複

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <nav className="mb-6 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
          {" / "}
          <Link href="/shop" className="hover:text-[var(--gold)]">商城</Link>
          {" / "}
          <span className="text-[var(--fg)]">{product.name}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* 左：圖片 */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="500px" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-[var(--fg-muted)]">📦</div>
            )}
            {product.isFeatured && (
              <span className="absolute left-3 top-3 rounded bg-[var(--gold)] px-2.5 py-0.5 text-xs font-bold text-black">★ 精選</span>
            )}
          </div>

          {/* 右：資訊 */}
          <div>
            {product.brand && (
              <div className="text-xs uppercase tracking-widest text-[var(--gold-soft)]">{product.brand}</div>
            )}
            <h1 className="mt-2 font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">{product.name}</h1>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-gold-gradient font-serif text-3xl font-bold">
                NT$ {product.price.toLocaleString()}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <>
                  <span className="text-sm text-[var(--fg-muted)] line-through">
                    NT$ {product.comparePrice.toLocaleString()}
                  </span>
                  <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 text-sm text-[var(--fg-muted)]">
              {product.stock > 0 ? (
                <span className="text-[var(--success)]">✓ 現貨 {product.stock} 件</span>
              ) : (
                <span className="text-red-400">✗ 暫時缺貨</span>
              )}
            </div>

            {product.description && (
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg)]">
                {product.description}
              </div>
            )}

            {product.stock > 0 && (
              <div className="mt-8">
                <AddProductButton
                  productId={product.id}
                  productSlug={product.slug}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  unitPrice={product.price}
                  size="lg"
                />
              </div>
            )}

            {/* 信任訊號 */}
            <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-[var(--fg-muted)]">
              <div className="flex items-center gap-2">🚚 7-11 取貨／宅配／自取</div>
              <div className="flex items-center gap-2">🔒 綠界 ECPay 安全付款</div>
              <div className="flex items-center gap-2">💎 14 年技術選品</div>
              <div className="flex items-center gap-2">📞 LINE 預約折 $100</div>
            </div>
          </div>
        </div>

        {/* 同分類商品 */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-serif text-xl text-[var(--gold)]">您可能也喜歡</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {related.map(p => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="refined-card group block overflow-hidden">
                  <div className="relative aspect-square bg-[var(--bg-soft)]">
                    {p.imageUrl && <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="200px" />}
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 text-xs text-[var(--fg)]">{p.name}</div>
                    <div className="mt-1 font-serif text-sm font-semibold text-[var(--gold)]">NT$ {p.price.toLocaleString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
