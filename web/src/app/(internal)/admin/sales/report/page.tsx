// 日結報表（Z Report） — 一日 POS 收入彙總，可列印對帳
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "現金", JKOPAY: "街口", LINEPAY: "LINE Pay", CARD: "信用卡", TRANSFER: "轉帳",
};

export default async function ZReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date ? new Date(sp.date) : new Date();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);

  const where = { createdAt: { gte: start, lte: end } };

  const [sales, byMethod, byStaff, voidSales] = await Promise.all([
    prisma.sale.findMany({
      where: { ...where, paymentStatus: "PAID" },
      include: { items: true, staff: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { ...where, paymentStatus: "PAID" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ["staffId"],
      where: { ...where, paymentStatus: "PAID" },
      _sum: { total: true, discount: true },
      _count: { _all: true },
    }),
    prisma.sale.findMany({
      where: { ...where, paymentStatus: "VOID" },
      include: { staff: true },
    }),
  ]);

  const staffMap = new Map<number, { name: string; code: string }>();
  for (const s of sales) staffMap.set(s.staffId, { name: s.staff.name, code: s.staff.code });
  for (const s of voidSales) staffMap.set(s.staffId, { name: s.staff.name, code: s.staff.code });

  // 商品 / 維修 / 客製類別統計
  const allItems = sales.flatMap(s => s.items);
  const productItems = allItems.filter(i => i.itemType === "PRODUCT" || i.itemType === "VARIANT");
  const repairItems = allItems.filter(i => i.itemType === "REPAIR");
  const customItems = allItems.filter(i => i.itemType === "CUSTOM");

  const productRevenue = productItems.reduce((s, i) => s + i.lineTotal, 0);
  const repairRevenue = repairItems.reduce((s, i) => s + i.lineTotal, 0);
  const customRevenue = customItems.reduce((s, i) => s + i.lineTotal, 0);

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalDiscount = sales.reduce((s, x) => s + x.discount, 0);
  const voidAmount = voidSales.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* 列印時隱藏 */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-serif text-2xl text-[var(--gold)]">📅 日結報表</h1>
        <div className="flex gap-2">
          <form className="flex gap-2">
            <input type="date" name="date" defaultValue={start.toISOString().slice(0, 10)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            <button className="btn-gold rounded-full px-4 py-2 text-sm">套用</button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 print:bg-white print:text-black">
        {/* Header */}
        <div className="text-center print:text-black">
          <div className="font-serif text-2xl text-[var(--gold)] print:text-black">{SITE.name} · 日結報表 (Z Report)</div>
          <div className="mt-1 text-sm text-[var(--fg-muted)] print:text-gray-600">
            {start.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })}
          </div>
        </div>

        {/* 主數字 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-[var(--fg-muted)] print:text-gray-600">交易筆數</div>
            <div className="mt-1 font-serif text-3xl text-[var(--gold)] print:text-black">{sales.length}</div>
          </div>
          <div className="border-x border-[var(--border)]">
            <div className="text-xs text-[var(--fg-muted)] print:text-gray-600">總收入</div>
            <div className="mt-1 font-serif text-3xl text-[var(--gold)] print:text-black">${totalRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--fg-muted)] print:text-gray-600">平均客單</div>
            <div className="mt-1 font-serif text-3xl text-[var(--gold)] print:text-black">{sales.length > 0 ? `$${Math.round(totalRevenue / sales.length).toLocaleString()}` : "—"}</div>
          </div>
        </div>

        {/* 付款方式 */}
        <h2 className="mt-6 mb-2 font-serif text-base text-[var(--gold)] print:text-black">💳 付款方式分析</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-[var(--fg-muted)] print:text-gray-600">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 text-left font-normal">付款</th>
              <th className="py-2 text-right font-normal">筆數</th>
              <th className="py-2 text-right font-normal">小計</th>
              <th className="py-2 text-right font-normal">佔比</th>
            </tr>
          </thead>
          <tbody>
            {byMethod.map(m => {
              const sum = m._sum.total || 0;
              const pct = totalRevenue > 0 ? (sum / totalRevenue) * 100 : 0;
              return (
                <tr key={m.paymentMethod} className="border-b border-[var(--border)]/40">
                  <td className="py-1.5">{PAYMENT_LABEL[m.paymentMethod] || m.paymentMethod}</td>
                  <td className="py-1.5 text-right">{m._count._all}</td>
                  <td className="py-1.5 text-right font-mono">${sum.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-[var(--fg-muted)]">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
            {byMethod.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-[var(--fg-muted)]">無交易</td></tr>}
          </tbody>
        </table>

        {/* 商品/維修/客製比例 */}
        <h2 className="mt-6 mb-2 font-serif text-base text-[var(--gold)] print:text-black">📊 類別分析</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-[var(--fg-muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 text-left font-normal">類別</th>
              <th className="py-2 text-right font-normal">品項</th>
              <th className="py-2 text-right font-normal">小計</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]/40"><td className="py-1.5">📦 商品</td><td className="py-1.5 text-right">{productItems.length}</td><td className="py-1.5 text-right font-mono">${productRevenue.toLocaleString()}</td></tr>
            <tr className="border-b border-[var(--border)]/40"><td className="py-1.5">🔧 維修</td><td className="py-1.5 text-right">{repairItems.length}</td><td className="py-1.5 text-right font-mono">${repairRevenue.toLocaleString()}</td></tr>
            <tr className="border-b border-[var(--border)]/40"><td className="py-1.5">＋ 客製</td><td className="py-1.5 text-right">{customItems.length}</td><td className="py-1.5 text-right font-mono">${customRevenue.toLocaleString()}</td></tr>
          </tbody>
        </table>

        {/* 店員業績 */}
        <h2 className="mt-6 mb-2 font-serif text-base text-[var(--gold)] print:text-black">👥 店員業績</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-[var(--fg-muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 text-left font-normal">店員</th>
              <th className="py-2 text-right font-normal">筆數</th>
              <th className="py-2 text-right font-normal">折扣</th>
              <th className="py-2 text-right font-normal">收入</th>
            </tr>
          </thead>
          <tbody>
            {byStaff.map(s => {
              const info = staffMap.get(s.staffId);
              return (
                <tr key={s.staffId} className="border-b border-[var(--border)]/40">
                  <td className="py-1.5">{info?.code} · {info?.name || `#${s.staffId}`}</td>
                  <td className="py-1.5 text-right">{s._count._all}</td>
                  <td className="py-1.5 text-right text-red-400">${(s._sum.discount || 0).toLocaleString()}</td>
                  <td className="py-1.5 text-right font-mono">${(s._sum.total || 0).toLocaleString()}</td>
                </tr>
              );
            })}
            {byStaff.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-[var(--fg-muted)]">無交易</td></tr>}
          </tbody>
        </table>

        {/* 異常 */}
        {(voidSales.length > 0 || totalDiscount > 0) && (
          <>
            <h2 className="mt-6 mb-2 font-serif text-base text-[var(--gold)] print:text-black">⚠️ 異常／優惠</h2>
            <table className="w-full text-sm">
              <tbody>
                {totalDiscount > 0 && <tr className="border-b border-[var(--border)]/40"><td className="py-1.5">總折扣</td><td className="py-1.5 text-right font-mono text-red-400">-${totalDiscount.toLocaleString()}</td></tr>}
                {voidSales.length > 0 && <tr className="border-b border-[var(--border)]/40"><td className="py-1.5">作廢交易（{voidSales.length} 筆）</td><td className="py-1.5 text-right font-mono text-red-400">-${voidAmount.toLocaleString()}</td></tr>}
              </tbody>
            </table>
          </>
        )}

        {/* 對帳區塊（手動填） */}
        <div className="mt-8 border-t-2 border-dashed border-[var(--border)] pt-4 text-sm">
          <h2 className="mb-3 font-serif text-base text-[var(--gold)] print:text-black">💵 現金對帳（請手動填）</h2>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-[var(--border)]/40"><td className="py-2 text-[var(--fg-muted)]">系統現金收入</td><td className="py-2 text-right font-mono">${(byMethod.find(m => m.paymentMethod === "CASH")?._sum.total || 0).toLocaleString()}</td></tr>
              <tr className="border-b border-[var(--border)]/40"><td className="py-2 text-[var(--fg-muted)]">實際抽屜現金</td><td className="py-2 text-right font-mono">＿＿＿＿＿＿</td></tr>
              <tr className="border-b border-[var(--border)]/40"><td className="py-2 text-[var(--fg-muted)]">差額</td><td className="py-2 text-right font-mono">＿＿＿＿＿＿</td></tr>
              <tr><td className="py-3"></td><td className="py-3 text-right text-[var(--fg-muted)] print:text-gray-600">店員簽名 _____________</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-[var(--border)] pt-4 text-center text-[10px] text-[var(--fg-muted)] print:text-gray-500">
          列印於 {new Date().toLocaleString("zh-TW", { hour12: false })} · {SITE.name}
        </div>
      </div>
    </div>
  );
}
