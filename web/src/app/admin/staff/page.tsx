import { prisma } from "@/lib/prisma";
import { StaffList } from "./staff-list";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const staff = await prisma.staffMember.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { sales: true } } },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">👥 店員管理</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">店員用代號 + PIN 登入 POS 結帳台</p>
      </div>
      <StaffList initial={staff.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        role: s.role,
        isActive: s.isActive,
        salesCount: s._count.sales,
      }))} />
    </div>
  );
}
