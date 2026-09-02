import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CaseForm } from "../case-form";

export const dynamic = "force-dynamic";

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.caseStudy.findUnique({ where: { id: Number(id) } });
  if (!c) return notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/cases" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回列表</Link>
        <Link href={`/cases/${c.slug}`} target="_blank" className="text-xs text-[var(--gold)] hover:underline">
          🔗 預覽前台 (新分頁)
        </Link>
      </div>
      <h1 className="mt-2 mb-6 font-serif text-2xl text-[var(--gold)]">編輯案例</h1>
      <CaseForm
        initial={{
          id: c.id,
          title: c.title,
          brand: c.brand,
          deviceModel: c.deviceModel,
          issueType: c.issueType,
          description: c.description,
          beforePhotos: JSON.parse(c.beforePhotos || "[]"),
          afterPhotos: JSON.parse(c.afterPhotos || "[]"),
          repairMinutes: c.repairMinutes,
          cost: c.cost,
          customerInitial: c.customerInitial,
          isPublished: c.isPublished,
        }}
      />
    </div>
  );
}
