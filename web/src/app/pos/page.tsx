import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";
import { prisma } from "@/lib/prisma";
import { PosTerminal } from "./terminal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POS 結帳台",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const cs = await cookies();
  const tok = cs.get(POS_COOKIE)?.value;
  const staff = await verifyStaffSession(tok);
  if (!staff) redirect("/pos/login");

  // 載入熱門商品（提供快選）
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 100,
    include: {
      variants: { where: { isActive: true } },
      _count: { select: { } },
    },
  }).catch(() => []);

  // 對 tracksSerial 商品，撈所有 IN_STOCK 序號供 POS 選
  const serializedProductIds = products.filter(p => p.tracksSerial).map(p => p.id);
  const serials = serializedProductIds.length
    ? await prisma.productSerial.findMany({
        where: { productId: { in: serializedProductIds }, status: "IN_STOCK" },
        select: { id: true, productId: true, serial: true, productVariantId: true },
        orderBy: { receivedAt: "asc" },
      })
    : [];
  const serialsByProduct = new Map<number, Array<{ id: number; serial: string; productVariantId: number | null }>>();
  serials.forEach(s => {
    if (!serialsByProduct.has(s.productId)) serialsByProduct.set(s.productId, []);
    serialsByProduct.get(s.productId)!.push({ id: s.id, serial: s.serial, productVariantId: s.productVariantId });
  });

  // 載入熱門維修報價（前 30 個機型）
  const repairs = await prisma.repairPrice.findMany({
    where: { isAvailable: true },
    orderBy: { id: "desc" },
    take: 200,
    include: {
      model: { include: { brand: true } },
      item: true,
    },
  }).catch(() => []);

  // 把 RepairPrice 整理成 POS 格式
  const repairOptions = repairs.map(r => ({
    id: r.id,
    name: `${r.model.brand.nameZh}・${r.model.name}・${r.item.name}（${r.tier === "STANDARD" ? "標準" : "原廠"}）`,
    price: r.manualOverride ?? r.calculatedPrice ?? 0,
    isOverridden: r.manualOverride !== null,
    brand: r.model.brand.nameZh,
    model: r.model.name,
    tier: r.tier,
  })).filter(r => r.price > 0);

  // 把 Product / Variant 整理成 POS 格式
  interface ProductOpt {
    id: string;
    productId: number;
    variantId: number | null;
    name: string;
    sku: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    tracksSerial: boolean;
    availableSerials?: Array<{ id: number; serial: string }>;
  }
  const productOptions: ProductOpt[] = products.flatMap((p): ProductOpt[] => {
    if (p.variants.length === 0) {
      return [{
        id: `product:${p.id}`,
        productId: p.id,
        variantId: null,
        name: p.name,
        sku: p.slug,
        price: p.price,
        stock: p.stock,
        imageUrl: p.imageUrl,
        tracksSerial: p.tracksSerial,
        availableSerials: p.tracksSerial ? (serialsByProduct.get(p.id)?.map(s => ({ id: s.id, serial: s.serial })) || []) : undefined,
      }];
    }
    return p.variants.map((v): ProductOpt => ({
      id: `variant:${v.id}`,
      productId: p.id,
      variantId: v.id,
      name: `${p.name}（${v.name}）`,
      sku: v.sku || p.slug,
      price: v.price,
      stock: v.stock,
      imageUrl: v.imageUrl ?? p.imageUrl,
      tracksSerial: p.tracksSerial,
      availableSerials: p.tracksSerial
        ? (serialsByProduct.get(p.id)?.filter(s => s.productVariantId === v.id).map(s => ({ id: s.id, serial: s.serial })) || [])
        : undefined,
    }));
  });

  // 最近 30 天熱賣商品 ID（給 POS 快選欄）
  const since = new Date(Date.now() - 30 * 86400_000);
  const topSold = await prisma.saleItem.groupBy({
    by: ["productId", "productVariantId"],
    where: {
      sale: { createdAt: { gte: since }, paymentStatus: "PAID" },
      itemType: { in: ["PRODUCT", "VARIANT"] },
    },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: 10,
  }).catch(() => []);

  // 把熱賣 ID 對應到 productOptions
  const topSoldIds = new Set<string>();
  for (const t of topSold) {
    if (t.productVariantId) topSoldIds.add(`variant:${t.productVariantId}`);
    else if (t.productId) topSoldIds.add(`product:${t.productId}`);
  }
  const favorites = productOptions.filter(p => topSoldIds.has(p.id)).slice(0, 8);

  // 維修按品牌分組
  const repairBrands = Array.from(new Set(repairOptions.map(r => r.brand))).sort();

  // 套餐組合（POS 一鍵加入）
  const bundlesRaw = await prisma.productBundle.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);
  const bundles = bundlesRaw.map(b => {
    const items = JSON.parse(b.items || "[]") as Array<{ productId?: number; productVariantId?: number; qty: number; label?: string }>;
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      price: b.price,
      imageUrl: b.imageUrl,
      // 解析成 POS 可加入的格式（帶 product info）
      items: items.map(it => {
        const opt = productOptions.find(p =>
          (it.productId && p.productId === it.productId && !p.variantId) ||
          (it.productVariantId && p.variantId === it.productVariantId)
        );
        return { ...it, name: opt?.name || it.label || "未知商品", unitPrice: opt?.price || 0 };
      }),
    };
  });

  // 今日 KPI（站內 staff 看到士氣激勵）
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todayCount, todayRevenue, myCount, myRevenue] = await Promise.all([
    prisma.sale.count({ where: { createdAt: { gte: today }, paymentStatus: "PAID" } }).catch(() => 0),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "PAID" }, _sum: { total: true } }).then(r => r._sum.total || 0).catch(() => 0),
    prisma.sale.count({ where: { createdAt: { gte: today }, paymentStatus: "PAID", staffId: staff.staffId } }).catch(() => 0),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "PAID", staffId: staff.staffId }, _sum: { total: true } }).then(r => r._sum.total || 0).catch(() => 0),
  ]);
  const todayKpi = { count: todayCount, revenue: todayRevenue, myCount, myRevenue };

  return <PosTerminal staff={staff} products={productOptions} repairs={repairOptions} favorites={favorites} repairBrands={repairBrands} todayKpi={todayKpi} bundles={bundles} />;
}
