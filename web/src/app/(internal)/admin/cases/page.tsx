import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  const cases = await prisma.caseStudy.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[var(--gold)]">📋 維修案例</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">真實維修案例 SEO 大殺器．客戶看完信任感爆表</p>
        </div>
        <Link href="/admin/cases/new" className="btn-gold rounded-full px-4 py-2 text-sm">+ 新增案例</Link>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
          還沒有案例，按右上「+ 新增案例」開始累積<br />
          <span className="text-[10px]">tip：每個維修完工後拍 1 張前後對比照，5 分鐘寫一篇就能持續累積 SEO</span>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cases.map(c => {
            const a = JSON.parse(c.afterPhotos || "[]") as string[];
            const b = JSON.parse(c.beforePhotos || "[]") as string[];
            return (
              <Link
                key={c.id}
                href={`/admin/cases/${c.id}`}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--gold)]"
              >
                {(a[0] || b[0]) && <img src={a[0] || b[0]} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-3">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--gold-bright)]">{c.brand}</span>
                    <span className={c.isPublished ? "text-green-400" : "text-red-400"}>
                      {c.isPublished ? "✓ 上架" : "🔒 下架"}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium">{c.title}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{c.deviceModel} · {c.issueType}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
