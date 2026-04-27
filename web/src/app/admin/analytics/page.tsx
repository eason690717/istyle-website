import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = {
  today: { label: "今日", hours: 24 },
  "7d": { label: "近 7 天", hours: 24 * 7 },
  "30d": { label: "近 30 天", hours: 24 * 30 },
} as const;
type RangeKey = keyof typeof RANGES;

function startOf(rangeKey: RangeKey): Date {
  if (rangeKey === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() - RANGES[rangeKey].hours * 3600_000);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: RangeKey }>;
}) {
  const params = await searchParams;
  const range: RangeKey = (params.range && params.range in RANGES) ? params.range : "today";
  const since = startOf(range);
  const realtimeSince = new Date(Date.now() - 5 * 60_000);

  const [
    totalViews,
    uniqueSessions,
    realtimeSessions,
    topPages,
    topReferrers,
    deviceBreakdown,
    countryBreakdown,
    recentEvents,
    hourly,
  ] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }).then(rs => rs.length),
    prisma.pageView.findMany({
      where: { createdAt: { gte: realtimeSince } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }).then(rs => rs.length),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 15,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { createdAt: { gte: since }, referrer: { not: "(direct)" } },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 10,
    }),
    prisma.pageView.groupBy({
      by: ["device"],
      where: { createdAt: { gte: since }, device: { not: null } },
      _count: { _all: true },
    }),
    prisma.pageView.groupBy({
      by: ["country"],
      where: { createdAt: { gte: since }, country: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // 簡單的「每小時 pageview 計數」— 抓 raw 後 JS 分組（Turso/SQLite 沒 date_trunc）
    prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // 每小時 / 每天 桶分組
  const buckets = new Map<string, number>();
  const bucketSize = range === "today" ? "hour" : "day";
  hourly.forEach((r) => {
    const d = new Date(r.createdAt);
    const k = bucketSize === "hour"
      ? `${d.getHours().toString().padStart(2, "0")}:00`
      : `${d.getMonth() + 1}/${d.getDate()}`;
    buckets.set(k, (buckets.get(k) || 0) + 1);
  });
  const trend = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxTrend = Math.max(1, ...trend.map(([, v]) => v));

  // 折扣顯示工具
  const fmt = (n: number) => n.toLocaleString();
  const pageHref = (path: string) => path.startsWith("/") ? path : "#";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">📊 流量分析</h1>
        <div className="flex gap-2 text-xs">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/analytics?range=${k}`}
              className={`rounded border px-3 py-1.5 transition ${
                range === k
                  ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--gold-soft)]"
              }`}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI 四宮格 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="瀏覽次數" value={fmt(totalViews)} />
        <Card label="不重複訪客" value={fmt(uniqueSessions)} sub="以 session 計" />
        <Card label="即時訪客" value={fmt(realtimeSessions)} sub="近 5 分鐘" highlight />
        <Card label="平均 PV/訪客" value={uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : "—"} />
      </div>

      {/* 趨勢圖（純 CSS bars） */}
      <Section title={`${RANGES[range].label} 流量趨勢（${bucketSize === "hour" ? "每小時" : "每日"}）`}>
        {trend.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex h-32 items-end gap-1">
            {trend.map(([label, count]) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-[var(--gold)] opacity-80 transition hover:opacity-100"
                  style={{ height: `${(count / maxTrend) * 100}%`, minHeight: count > 0 ? "2px" : "0" }}
                  title={`${label}: ${count}`}
                />
                <span className="text-[10px] text-[var(--fg-muted)]">{label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="🔝 熱門頁面">
          {topPages.length === 0 ? <Empty /> : (
            <Table
              rows={topPages.map(p => [
                <Link key={p.path} href={pageHref(p.path)} className="text-[var(--gold-soft)] hover:underline" target="_blank">
                  {p.path}
                </Link>,
                fmt(p._count._all),
              ])}
              headers={["頁面", "PV"]}
            />
          )}
        </Section>

        <Section title="🌐 來源網站">
          {topReferrers.length === 0 ? <Empty hint="目前都是 (direct) 直接造訪" /> : (
            <Table
              rows={topReferrers.map(r => [
                <span key={r.referrer || ""} className="break-all text-xs text-[var(--fg-muted)]">{r.referrer}</span>,
                fmt(r._count._all),
              ])}
              headers={["referrer", "次數"]}
            />
          )}
        </Section>

        <Section title="📱 裝置分布">
          {deviceBreakdown.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {deviceBreakdown.map(d => {
                const pct = totalViews > 0 ? (d._count._all / totalViews) * 100 : 0;
                return (
                  <div key={d.device}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{d.device}</span>
                      <span className="text-[var(--fg-muted)]">{fmt(d._count._all)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--border)]">
                      <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="🌏 國家分布">
          {countryBreakdown.length === 0 ? <Empty hint="Vercel headers 沒抓到，可能是 localhost" /> : (
            <Table
              rows={countryBreakdown.map(c => [c.country, fmt(c._count._all)])}
              headers={["國家", "PV"]}
            />
          )}
        </Section>
      </div>

      <Section title="⚡ 自定義事件（最近 50 筆）">
        {recentEvents.length === 0 ? (
          <Empty hint="還沒有事件埋點觸發" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[var(--fg-muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 text-left font-normal">時間</th>
                  <th className="text-left font-normal">事件</th>
                  <th className="text-left font-normal">頁面</th>
                  <th className="text-left font-normal">data</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(e => (
                  <tr key={e.id} className="border-b border-[var(--border)]/40">
                    <td className="py-2 text-[var(--fg-muted)]">{new Date(e.createdAt).toLocaleString("zh-TW", { hour12: false })}</td>
                    <td className="font-mono">{e.name}</td>
                    <td className="text-[var(--fg-muted)]">{e.path || "—"}</td>
                    <td className="font-mono text-[var(--fg-muted)]">{e.data || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Card({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-[var(--gold)] bg-[var(--gold)]/5" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-2xl text-[var(--gold)]">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <h2 className="mb-3 font-serif text-base text-[var(--gold)]">{title}</h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-[var(--fg-muted)]">
          <tr className="border-b border-[var(--border)]">
            {headers.map(h => <th key={h} className="py-2 text-left font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border)]/40">
              {r.map((c, j) => <td key={j} className="py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ hint }: { hint?: string }) {
  return (
    <div className="py-6 text-center text-xs text-[var(--fg-muted)]">
      {hint || "尚無資料"}
    </div>
  );
}
