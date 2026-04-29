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

  return <PosTerminal staff={staff} products={productOptions} repairs={repairOptions} />;
}
