import { prisma } from "@/lib/prisma";
import { triggerRefresh } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  phone: "手機", tablet: "平板", laptop_pro: "MBP", laptop_air: "MBA",
  desktop: "桌機", console: "主機", dyson: "Dyson",
};

export default async function AdminRecyclePage() {
  const [items, lastLog] = await Promise.all([
    prisma.recyclePrice.findMany({
      orderBy: [{ category: "asc" }, { minPrice: "desc" }],
      take: 500,
    }).catch(() => []),
    prisma.recycleScrapeLog.findFirst({ orderBy: { finishedAt: "desc" } }).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">二手回收價管理</h1>
        <form action={triggerRefresh}>
          <button type="submit" className="btn-gold rounded-full px-4 py-2 text-xs">
            立即重新抓取
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-sm">
        <div>共 {items.length} 個機型</div>
        {lastLog && (
          <div className="mt-1 text-xs text-[var(--fg-muted)]">
            最後抓取：{new Date(lastLog.finishedAt).toLocaleString("zh-TW")} ({lastLog.source} – {lastLog.status})
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
            <tr>
              <th className="px-3 py-2">機型</th>
              <th className="px-3 py-2">類別</th>
              <th className="px-3 py-2">容量</th>
              <th className="px-3 py-2 text-right">來源 1</th>
              <th className="px-3 py-2 text-right">來源 2</th>
              <th className="px-3 py-2 text-right">來源 3</th>
              <th className="px-3 py-2 text-right">最低價（對外）</th>
              <th className="px-3 py-2">更新時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {items.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                <td className="px-3 py-2">{p.modelName}</td>
                <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">{CATEGORY_LABEL[p.category] || p.category}</td>
                <td className="px-3 py-2 text-xs">{p.storage || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{p.source1Price?.toLocaleString() || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{p.source2Price?.toLocaleString() || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{p.source3Price?.toLocaleString() || "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-[var(--gold)]">
                  {p.minPrice?.toLocaleString() || "—"}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">
                  {new Date(p.lastUpdatedAt).toLocaleDateString("zh-TW")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
