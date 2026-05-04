import { prisma } from "@/lib/prisma";
import { BundlesManager } from "./bundles-manager";

export const dynamic = "force-dynamic";

export default async function AdminBundlesPage() {
  const [bundles, products] = await Promise.all([
    prisma.productBundle.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }] }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 200,
      select: { id: true, name: true, slug: true, price: true, imageUrl: true },
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">🎁 商品套餐</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">預存常賣組合，POS 一鍵加入購物車（如：螢幕保護貼套組、新機開箱組）</p>
      </div>
      <BundlesManager
        initial={bundles.map(b => ({
          id: b.id, name: b.name, description: b.description, price: b.price,
          items: JSON.parse(b.items || "[]"), imageUrl: b.imageUrl, category: b.category, isActive: b.isActive,
        }))}
        products={products}
      />
    </div>
  );
}
