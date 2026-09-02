"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface BundleItem {
  productId?: number;
  productVariantId?: number;
  qty: number;
  label?: string;  // 顯示用 fallback（產品名 cache）
}

export async function saveBundle(args: {
  id?: number;
  name: string;
  description?: string;
  price: number;
  items: BundleItem[];
  imageUrl?: string;
  category?: string;
  isActive: boolean;
}) {
  if (!args.name.trim()) return { ok: false, error: "請填套餐名稱" };
  if (args.price < 0) return { ok: false, error: "價格不可負數" };
  if (args.items.length === 0) return { ok: false, error: "至少要加一項商品" };

  const data = {
    name: args.name.trim(),
    description: args.description?.trim() || null,
    price: args.price,
    items: JSON.stringify(args.items),
    imageUrl: args.imageUrl || null,
    category: args.category || null,
    isActive: args.isActive,
  };

  if (args.id) {
    await prisma.productBundle.update({ where: { id: args.id }, data });
  } else {
    await prisma.productBundle.create({ data });
  }
  revalidatePath("/admin/bundles");
  revalidatePath("/pos");
  return { ok: true };
}

export async function deleteBundle(id: number) {
  await prisma.productBundle.delete({ where: { id } });
  revalidatePath("/admin/bundles");
  revalidatePath("/pos");
  return { ok: true };
}
