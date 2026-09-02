import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  RECEIVE:  { label: "📥 進貨",   color: "text-green-400" },
  ADJUST:   { label: "📊 盤點",   color: "text-blue-400" },
  SALE:     { label: "💰 銷售",   color: "text-[var(--gold)]" },
  RETURN:   { label: "↩️ 退貨",   color: "text-orange-400" },
  DAMAGE:   { label: "💥 損壞",   color: "text-red-400" },
  TRANSFER: { label: "🔁 轉倉",   color: "text-purple-400" },
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const where: Record<string, unknown> = {};
  if (sp.type) where.type = sp.type;
  if (sp.from || sp.to) {
    const range: Record<string, Date> = {};
    if (sp.from) range.gte = new Date(sp.from);
    if (sp.to) range.lte = new Date(sp.to);
    where.createdAt = range;
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // 收集要 join 的 product / variant id
  const productIds = movements.filter(m => m.productId).map(m => m.productId!);
  const variantIds = movements.filter(m => m.productVariantId).map(m => m.productVariantId!);
  const [products, variants] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } }) : Promise.resolve([]),
    variantIds.length ? prisma.productVariant.findMany({ where: { id: { in: variantIds } }, include: { product: { select: { name: true } } } }) : Promise.resolve([]),
  ]);
  const productMap = new Map(products.map(p => [p.id, p]));
  const variantMap = new Map(variants.map(v => [v.id, v]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回庫存</Link>
        <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">📋 庫存異動紀錄</h1>
      </div>

      {/* 過濾 */}
      <form className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
        <select name="type" defaultValue={sp.type || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
          <option value="">全部類型</option>
          <option value="RECEIVE">進貨</option>
          <option value="ADJUST">盤點</option>
          <option value="SALE">銷售</option>
          <option value="RETURN">退貨</option>
          <option value="DAMAGE">損壞</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <span className="self-center">~</span>
        <input type="date" name="to" defaultValue={sp.to || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <button className="btn-gold rounded-full px-3 py-1.5">套用</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">時間</th>
              <th className="p-3 text-left font-normal">類型</th>
              <th className="p-3 text-left font-normal">商品</th>
              <th className="p-3 text-right font-normal">數量</th>
              <th className="p-3 text-right font-normal">前→後</th>
              <th className="p-3 text-left font-normal">備註</th>
              <th className="p-3 text-left font-normal">誰</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => {
              const productName = m.productVariantId
                ? (() => {
                    const v = variantMap.get(m.productVariantId!);
                    return v ? `${v.product.name}（${v.name}）` : `規格 #${m.productVariantId}`;
                  })()
                : m.productId ? (productMap.get(m.productId)?.name || `商品 #${m.productId}`) : "—";
              const t = TYPE_LABEL[m.type] || { label: m.type, color: "" };
              return (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="p-3 text-xs text-[var(--fg-muted)]">{new Date(m.createdAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</td>
                  <td className={`p-3 text-xs ${t.color}`}>{t.label}</td>
                  <td className="p-3 max-w-xs truncate">{productName}</td>
                  <td className={`p-3 text-right font-mono ${m.qty > 0 ? "text-green-400" : "text-red-400"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</td>
                  <td className="p-3 text-right font-mono text-xs text-[var(--fg-muted)]">{m.prevStock} → {m.newStock}</td>
                  <td className="p-3 max-w-xs truncate text-xs">
                    {m.poNumber && <span className="mr-1 rounded bg-[var(--gold)]/10 px-1 text-[10px] text-[var(--gold-bright)]">#{m.poNumber}</span>}
                    {m.supplier && <span className="text-[var(--fg-muted)]">@{m.supplier} </span>}
                    {m.reason || m.notes || ""}
                  </td>
                  <td className="p-3 text-xs text-[var(--fg-muted)]">{m.adminEmail || "—"}</td>
                </tr>
              );
            })}
            {movements.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-sm text-[var(--fg-muted)]">尚無異動紀錄</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
