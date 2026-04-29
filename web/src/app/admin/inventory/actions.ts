"use server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME } from "@/lib/admin-auth";

async function getAdminEmail(): Promise<string> {
  const cs = await cookies();
  const tok = cs.get(COOKIE_NAME)?.value;
  if (!tok) return "unknown";
  const sess = await prisma.adminSession.findUnique({ where: { token: tok } }).catch(() => null);
  return sess?.user || "unknown";
}

// === 通用：用 SKU / 條碼 / slug / 名稱 找出 Product 或 ProductVariant ===
export async function searchProduct(query: string) {
  const q = query.trim();
  if (!q) return null;

  // 先試 Variant SKU 完全比對
  const variant = await prisma.productVariant.findFirst({
    where: { sku: q, isActive: true },
    include: { product: true },
  }).catch(() => null);
  if (variant) {
    return {
      kind: "VARIANT" as const,
      productId: variant.productId,
      variantId: variant.id,
      name: `${variant.product.name}（${variant.name}）`,
      sku: variant.sku,
      stock: variant.stock,
      price: variant.price,
      imageUrl: variant.imageUrl ?? variant.product.imageUrl,
      tracksSerial: variant.product.tracksSerial,
    };
  }

  // Product slug 完全比對
  const productExact = await prisma.product.findFirst({
    where: { slug: q, isActive: true },
  }).catch(() => null);
  if (productExact) {
    return {
      kind: "PRODUCT" as const,
      productId: productExact.id,
      variantId: null,
      name: productExact.name,
      sku: productExact.slug,
      stock: productExact.stock,
      price: productExact.price,
      imageUrl: productExact.imageUrl,
      tracksSerial: productExact.tracksSerial,
    };
  }

  // 模糊搜尋（名稱 / SKU / slug 包含）
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
      ],
    },
  }).catch(() => null);
  if (product) {
    return {
      kind: "PRODUCT" as const,
      productId: product.id,
      variantId: null,
      name: product.name,
      sku: product.slug,
      stock: product.stock,
      price: product.price,
      imageUrl: product.imageUrl,
      tracksSerial: product.tracksSerial,
    };
  }

  return null;
}

// === 進貨單筆序號（IMEI）— tracksSerial 商品專用 ===
export async function receiveSerial(args: {
  productId: number;
  productVariantId?: number;
  serial: string;
  cost?: number;
  notes?: string;
}) {
  const adminEmail = await getAdminEmail();
  const serial = args.serial.trim();
  if (!serial) return { ok: false, error: "請輸入序號" };

  // 重複檢查
  const existing = await prisma.productSerial.findFirst({
    where: { productId: args.productId, serial },
  });
  if (existing) return { ok: false, error: `序號 ${serial} 已存在 (status: ${existing.status})` };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productSerial.create({
        data: {
          productId: args.productId,
          productVariantId: args.productVariantId ?? null,
          serial,
          status: "IN_STOCK",
          cost: args.cost ?? null,
          notes: args.notes || null,
          receivedBy: adminEmail,
        },
      });

      // 同時 +1 到 Product/Variant.stock 維持一致
      if (args.productVariantId) {
        const v = await tx.productVariant.findUnique({ where: { id: args.productVariantId } });
        if (v) {
          await tx.productVariant.update({ where: { id: args.productVariantId }, data: { stock: v.stock + 1 } });
          await tx.stockMovement.create({
            data: {
              type: "RECEIVE",
              productVariantId: args.productVariantId,
              qty: 1,
              prevStock: v.stock,
              newStock: v.stock + 1,
              unitCost: args.cost ?? null,
              reason: `序號進貨 ${serial}`,
              adminEmail,
            },
          });
        }
      } else {
        const p = await tx.product.findUnique({ where: { id: args.productId } });
        if (p) {
          await tx.product.update({ where: { id: args.productId }, data: { stock: p.stock + 1 } });
          await tx.stockMovement.create({
            data: {
              type: "RECEIVE",
              productId: args.productId,
              qty: 1,
              prevStock: p.stock,
              newStock: p.stock + 1,
              unitCost: args.cost ?? null,
              reason: `序號進貨 ${serial}`,
              adminEmail,
            },
          });
        }
      }
    });
    revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// === 列出某商品的所有序號 ===
export async function listProductSerials(productId: number, status?: string) {
  return prisma.productSerial.findMany({
    where: { productId, ...(status ? { status } : {}) },
    orderBy: { receivedAt: "desc" },
    take: 200,
  }).catch(() => []);
}

// === 進貨：批次 +qty ===
export async function receiveStock(args: {
  items: Array<{
    productId?: number;
    productVariantId?: number;
    qty: number;
    unitCost?: number;
  }>;
  poNumber?: string;
  supplier?: string;
  notes?: string;
}) {
  if (!args.items.length) return { ok: false, error: "請加入至少一項" };
  const adminEmail = await getAdminEmail();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const movements: number[] = [];
      for (const it of args.items) {
        if (it.qty <= 0) continue;
        let prevStock = 0; let newStock = 0;

        if (it.productVariantId) {
          const v = await tx.productVariant.findUnique({ where: { id: it.productVariantId } });
          if (!v) throw new Error("規格不存在");
          prevStock = v.stock;
          newStock = v.stock + it.qty;
          await tx.productVariant.update({ where: { id: it.productVariantId }, data: { stock: newStock } });
        } else if (it.productId) {
          const p = await tx.product.findUnique({ where: { id: it.productId } });
          if (!p) throw new Error("商品不存在");
          prevStock = p.stock;
          newStock = p.stock + it.qty;
          await tx.product.update({ where: { id: it.productId }, data: { stock: newStock } });
        } else continue;

        const m = await tx.stockMovement.create({
          data: {
            type: "RECEIVE",
            productId: it.productId ?? null,
            productVariantId: it.productVariantId ?? null,
            qty: it.qty,
            prevStock, newStock,
            unitCost: it.unitCost ?? null,
            poNumber: args.poNumber || null,
            supplier: args.supplier || null,
            notes: args.notes || null,
            adminEmail,
          },
        });
        movements.push(m.id);
      }
      return movements;
    });
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    return { ok: true, count: result.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// === 盤點：直接設成實際庫存（產生 ADJUST movement 記差額）===
export async function adjustStock(args: {
  productId?: number;
  productVariantId?: number;
  actualStock: number;
  reason?: string;
}) {
  if (args.actualStock < 0) return { ok: false, error: "庫存不可負數" };
  const adminEmail = await getAdminEmail();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let prevStock = 0;

      if (args.productVariantId) {
        const v = await tx.productVariant.findUnique({ where: { id: args.productVariantId } });
        if (!v) throw new Error("規格不存在");
        prevStock = v.stock;
        await tx.productVariant.update({ where: { id: args.productVariantId }, data: { stock: args.actualStock } });
      } else if (args.productId) {
        const p = await tx.product.findUnique({ where: { id: args.productId } });
        if (!p) throw new Error("商品不存在");
        prevStock = p.stock;
        await tx.product.update({ where: { id: args.productId }, data: { stock: args.actualStock } });
      } else throw new Error("缺商品/規格 ID");

      const diff = args.actualStock - prevStock;
      const m = await tx.stockMovement.create({
        data: {
          type: "ADJUST",
          productId: args.productId ?? null,
          productVariantId: args.productVariantId ?? null,
          qty: diff,
          prevStock,
          newStock: args.actualStock,
          reason: args.reason || "盤點調整",
          adminEmail,
        },
      });
      return { diff, movementId: m.id };
    });
    revalidatePath("/admin/inventory");
    return { ok: true, diff: result.diff };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
