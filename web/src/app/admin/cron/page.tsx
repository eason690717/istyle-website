import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const CRON_JOBS = [
  {
    name: "二手回收價更新",
    path: "/api/cron/refresh-recycle",
    schedule: "每日 02:00（台灣）",
    description: "從 source1 + source2 抓最新二手回收價，取最低存入 DB",
  },
  {
    name: "自動產生文章",
    path: "/api/cron/generate-articles",
    schedule: "每日 03:00（台灣）",
    description: "依資料動態產生「每週回收行情」「每月維修報價報告」",
  },
  {
    name: "維修報價更新",
    path: "/api/cron/refresh-prices",
    schedule: "每週一 04:00（台灣）",
    description: "從 cerphone 抓 10 品牌維修報價，套公式 ×1.15 進位百，自動 upsert",
  },
];

export default async function AdminCronPage() {
  const recentLogs = await prisma.recycleScrapeLog.findMany({
    take: 30,
    orderBy: { finishedAt: "desc" },
  }).catch(() => []);

  const articleCount = await prisma.autoArticle.count().catch(() => 0);
  const recentArticles = await prisma.autoArticle.findMany({
    take: 10,
    orderBy: { publishedAt: "desc" },
  }).catch(() => []);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl text-[var(--gold)]">自動排程任務</h1>

      <section>
        <h2 className="mb-3 font-serif text-lg text-[var(--gold)]">排程清單</h2>
        <div className="space-y-3">
          {CRON_JOBS.map(job => (
            <div key={job.path} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-[var(--gold)]">{job.name}</h3>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">{job.description}</p>
                  <p className="mt-1 text-xs text-[var(--gold-soft)]">⏰ {job.schedule}</p>
                </div>
                <a
                  href={`${job.path}?secret=${process.env.CRON_SECRET || "set-CRON_SECRET-env"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold rounded-full px-4 py-2 text-xs"
                >
                  立即觸發
                </a>
              </div>
              <p className="mt-2 text-[10px] font-mono text-[var(--fg-muted)]">{job.path}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-[var(--gold)]">回收價抓取記錄（最近 30 筆）</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          {recentLogs.length === 0 ? (
            <div className="bg-[var(--bg-elevated)] p-8 text-center text-sm text-[var(--fg-muted)]">尚無記錄</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
                <tr>
                  <th className="px-3 py-2">時間</th>
                  <th className="px-3 py-2">來源</th>
                  <th className="px-3 py-2">狀態</th>
                  <th className="px-3 py-2 text-right">筆數</th>
                  <th className="px-3 py-2 text-right">耗時 (ms)</th>
                  <th className="px-3 py-2">錯誤</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {recentLogs.map((log, i) => (
                  <tr key={log.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                    <td className="px-3 py-2 text-xs">{new Date(log.finishedAt).toLocaleString("zh-TW")}</td>
                    <td className="px-3 py-2 text-xs font-mono">{log.source}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${log.status === "success" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                        {log.status === "success" ? "成功" : "失敗"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{log.recordCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{log.durationMs ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-red-400 max-w-md truncate">{log.errorMsg || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg text-[var(--gold)]">自動產生文章（共 {articleCount} 篇）</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          {recentArticles.length === 0 ? (
            <div className="bg-[var(--bg-elevated)] p-8 text-center text-sm text-[var(--fg-muted)]">尚無文章。請點上方「立即觸發」</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
                <tr>
                  <th className="px-3 py-2">日期</th>
                  <th className="px-3 py-2">類型</th>
                  <th className="px-3 py-2">標題</th>
                  <th className="px-3 py-2">連結</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {recentArticles.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                    <td className="px-3 py-2 text-xs">{a.publishedAt.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2 text-xs">{a.kind}</td>
                    <td className="px-3 py-2 max-w-md truncate">{a.title}</td>
                    <td className="px-3 py-2"><a href={`/blog/auto/${a.slug}`} target="_blank" className="text-xs text-[var(--gold)] underline">看文章</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
