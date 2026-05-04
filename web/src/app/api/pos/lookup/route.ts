// 歷史交易快查 API：給 POS 終端使用
// 支援搜：銷售單號 / IMEI / 客戶姓名 / 客戶電話末 4 碼
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // 驗 staff
  const cs = await cookies();
  const tok = cs.get(POS_COOKIE)?.value;
  const staff = await verifyStaffSession(tok);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  // 平行查 4 種方式
  const [bySaleNo, byImei, byPhone, byName] = await Promise.all([
    // 1. 銷售單號（前綴比對）
    prisma.sale.findMany({
      where: { saleNumber: { contains: q.toUpperCase() } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { staff: true, items: { take: 3 } },
    }),
    // 2. IMEI（從 SaleItem.serial 找）
    prisma.sale.findMany({
      where: { items: { some: { serial: { contains: q } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { staff: true, items: { where: { serial: { contains: q } }, take: 3 } },
    }),
    // 3. 客戶電話（末 4 碼或全號）
    /^\d{3,}$/.test(q)
      ? prisma.sale.findMany({
          where: { customerPhone: { contains: q } },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { staff: true, items: { take: 3 } },
        })
      : Promise.resolve([]),
    // 4. 客戶姓名
    prisma.sale.findMany({
      where: { customerName: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { staff: true, items: { take: 3 } },
    }),
  ]);

  // 合併去重，按 createdAt desc
  const seen = new Set<number>();
  const merged = [...bySaleNo, ...byImei, ...byPhone, ...byName]
    .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map(s => ({
      id: s.id,
      saleNumber: s.saleNumber,
      total: s.total,
      paymentStatus: s.paymentStatus,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      createdAt: s.createdAt,
      staffName: s.staff.name,
      itemCount: s.items.length,
      firstItemName: s.items[0]?.name || "",
      // 序號保固資訊
      serials: s.items.filter(i => i.serial).map(i => i.serial!),
    }));

  return NextResponse.json({ results: merged });
}
