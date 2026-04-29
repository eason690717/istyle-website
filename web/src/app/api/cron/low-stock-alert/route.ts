// 每日檢查低庫存，notifyOwner（LINE / console fallback）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/notify";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THRESHOLD = 3;

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: THRESHOLD } },
      orderBy: { stock: "asc" },
      select: { id: true, name: true, slug: true, stock: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: THRESHOLD } },
      orderBy: { stock: "asc" },
      include: { product: { select: { name: true } } },
    }),
  ]);

  const lowItems = [
    ...products.map(p => ({ name: p.name, stock: p.stock, sku: p.slug })),
    ...variants.map(v => ({ name: `${v.product.name}（${v.name}）`, stock: v.stock, sku: v.sku || "" })),
  ];

  if (lowItems.length === 0) {
    return NextResponse.json({ ok: true, lowCount: 0, message: "All good" });
  }

  // 通知老闆
  const lines = [
    "⚠️ 低庫存警示",
    `${lowItems.length} 個商品 / 規格 庫存 ≤ ${THRESHOLD}：`,
    "",
    ...lowItems.slice(0, 20).map(i => `• ${i.name} (剩 ${i.stock})`),
    lowItems.length > 20 ? `...還有 ${lowItems.length - 20} 項` : "",
    "",
    `→ https://www.i-style.store/admin/inventory`,
  ].filter(Boolean);

  await notifyOwner(lines.join("\n")).catch(console.error);

  return NextResponse.json({
    ok: true,
    lowCount: lowItems.length,
    items: lowItems.slice(0, 20),
  });
}
