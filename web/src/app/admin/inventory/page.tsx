import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryHomePage() {
  const [productCount, totalStock, lowStock, recentMovements] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.aggregate({ where: { isActive: true }, _sum: { stock: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 3 } },
      take: 10,
      orderBy: { stock: "asc" },
      select: { id: true, slug: true, name: true, stock: true },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-[var(--gold)]">📦 庫存管理</h1>

      {/* 入口卡片 — 手機友善大按鈕 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/admin/inventory/receive" className="group flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-green-500">
          <div className="text-3xl">📥</div>
          <div className="mt-2 font-serif text-base text-[var(--gold)] group-hover:text-green-400">進貨</div>
          <div className="text-[10px] text-[var(--fg-muted)]">掃條碼／語音</div>
        </Link>
        <Link href="/admin/inventory/count" className="group flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-blue-500">
          <div className="text-3xl">📊</div>
          <div className="mt-2 font-serif text-base text-[var(--gold)] group-hover:text-blue-400">盤點</div>
          <div className="text-[10px] text-[var(--fg-muted)]">秒抓誤差</div>
        </Link>
        <Link href="/admin/inventory/import" className="group flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-purple-500">
          <div className="text-3xl">📑</div>
          <div className="mt-2 font-serif text-base text-[var(--gold)] group-hover:text-purple-400">CSV 匯入</div>
          <div className="text-[10px] text-[var(--fg-muted)]">批次進貨</div>
        </Link>
        <Link href="/admin/inventory/movements" className="group flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--gold)]">
          <div className="text-3xl">📋</div>
          <div className="mt-2 font-serif text-base text-[var(--gold)] group-hover:text-[var(--gold-bright)]">異動紀錄</div>
          <div className="text-[10px] text-[var(--fg-muted)]">完整稽核</div>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="商品數" value={productCount.toString()} />
        <Stat label="總庫存量" value={(totalStock._sum.stock || 0).toLocaleString()} />
        <Stat label="低庫存（≤3）" value={lowStock.length.toString()} highlight={lowStock.length > 0} />
        <Stat label="近 30 天異動" value={recentMovements.length.toString()} />
      </div>

      {/* 低庫存警示 */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border-2 border-orange-500/40 bg-orange-500/5 p-4">
          <h2 className="mb-3 font-serif text-base text-orange-400">⚠️ 低庫存（≤ 3）— 該進貨了</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {lowStock.map(p => (
              <Link
                key={p.id}
                href={`/admin/inventory/receive?sku=${encodeURIComponent(p.slug)}`}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 hover:border-[var(--gold)]"
              >
                <span className="truncate text-sm">{p.name}</span>
                <span className="ml-2 shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">剩 {p.stock}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs text-[var(--fg-muted)]">
        💡 進貨／盤點頁面已優化成手機操作 — 用手機開後台 → 庫存就能掃碼。Chrome 系列瀏覽器支援 BarcodeDetector + Web Speech API
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-orange-500/40 bg-orange-500/5" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className={`mt-1 font-serif text-2xl ${highlight ? "text-orange-400" : "text-[var(--gold)]"}`}>{value}</div>
    </div>
  );
}
