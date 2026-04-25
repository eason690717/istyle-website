// 即時搜尋 API — 給 hero 即時報價 widget 用
// GET /api/search-quote?q=iphone+15
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface QuoteResult {
  modelId: number;
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
  section: string | null;
  topItems: Array<{ name: string; price: number }>;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  // 拆 token，全部要 match
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);

  try {
    // 抓所有 model + brand（含 prices 取常見項目）
    const models = await prisma.deviceModel.findMany({
      where: { isActive: true },
      include: {
        brand: true,
        prices: {
          where: { isAvailable: true, calculatedPrice: { not: null } },
          take: 5,
          include: { item: true },
        },
      },
      take: 500,
    });

    const matched = models.filter(m => {
      const haystack = `${m.brand.name} ${m.brand.nameZh} ${m.name} ${m.section || ""}`.toLowerCase();
      return tokens.every(t => haystack.includes(t));
    }).slice(0, 12);

    const results: QuoteResult[] = matched.map(m => ({
      modelId: m.id,
      brandSlug: m.brand.slug,
      brandName: m.brand.name,
      modelSlug: m.slug,
      modelName: m.name,
      section: m.section,
      topItems: m.prices
        .filter(p => p.calculatedPrice != null)
        .slice(0, 3)
        .map(p => ({
          name: p.item.name.replace(/^APPLE/i, "").replace(/原廠/g, "").trim() || p.item.name,
          price: (p.manualOverride ?? p.calculatedPrice!) as number,
        })),
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) }, { status: 500 });
  }
}
