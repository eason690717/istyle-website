// POS 客戶查詢 API：輸入手機末 4 碼或姓名，回最近 5 筆客戶
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cs = await cookies();
  const staff = await verifyStaffSession(cs.get(POS_COOKIE)?.value);
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // 同時找 Sale + PaymentLink + RepairTicket
  const [sales, payLinks] = await Promise.all([
    prisma.sale.findMany({
      where: {
        OR: [
          { customerPhone: { contains: q } },
          { customerName: { contains: q } },
        ],
        customerPhone: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { customerName: true, customerPhone: true, total: true, createdAt: true },
    }),
    prisma.paymentLink.findMany({
      where: {
        OR: [
          { customerPhone: { contains: q } },
          { customerName: { contains: q } },
          { customerEmail: { contains: q } },
        ],
        customerPhone: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { customerName: true, customerPhone: true, customerEmail: true, amount: true, createdAt: true },
    }),
  ]);

  // 去重 by phone
  const map = new Map<string, { name: string; phone: string; email?: string; lastSpend: number; lastSeen: Date }>();
  for (const s of sales) {
    if (!s.customerPhone) continue;
    const k = s.customerPhone.replace(/\D/g, "");
    if (!map.has(k)) map.set(k, { name: s.customerName || "", phone: k, lastSpend: s.total, lastSeen: s.createdAt });
  }
  for (const p of payLinks) {
    if (!p.customerPhone) continue;
    const k = p.customerPhone.replace(/\D/g, "");
    if (!map.has(k)) map.set(k, { name: p.customerName || "", phone: k, email: p.customerEmail || undefined, lastSpend: p.amount, lastSeen: p.createdAt });
  }

  return NextResponse.json({
    results: Array.from(map.values()).slice(0, 5),
  });
}
