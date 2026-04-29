"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProductFormState = { ok: boolean; error?: string; savedAt?: number };

function slugify(s: string) {
  // ASCII-only：Next.js dynamic route 對中文 slug 不穩，純英數 + hyphen 最安全
  const ascii = s.toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[\s_/\\.,'"`]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")  // 移除非 ASCII（含中文）
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // 全中文商品名 → 變空字串 → 用隨機 hash 兜底
  return ascii || `p-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createProduct(_prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  let newId: number;
  try {
    const name = fd.get("name")?.toString().trim();
    if (!name) return { ok: false, error: "商品名稱必填" };

    let slug = fd.get("slug")?.toString().trim() || slugify(name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const product = await prisma.product.create({
      data: {
        slug,
        name,
        category: fd.get("category")?.toString() || "other",
        brand: fd.get("brand")?.toString() || null,
        description: fd.get("description")?.toString() || null,
        imageUrl: fd.get("imageUrl")?.toString() || null,
        price: parseInt(fd.get("price")?.toString() || "0"),
        comparePrice: fd.get("comparePrice") ? parseInt(fd.get("comparePrice")!.toString()) : null,
        cost: fd.get("cost") ? parseInt(fd.get("cost")!.toString()) : null,
        stock: parseInt(fd.get("stock")?.toString() || "0"),
        isActive: fd.get("isActive") === "on",
        isFeatured: fd.get("isFeatured") === "on",
        tracksSerial: fd.get("tracksSerial") === "on",
        sortOrder: parseInt(fd.get("sortOrder")?.toString() || "0"),
      },
    });
    newId = product.id;

    revalidatePath("/admin/products");
    revalidatePath("/shop");
  } catch (e) {
    console.error("[createProduct] failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "建立失敗（未知錯誤）" };
  }
  redirect(`/admin/products/${newId}/variants`);
}

export async function updateProduct(id: number, _prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  try {
    const name = fd.get("name")?.toString().trim();
    if (!name) return { ok: false, error: "商品名稱必填" };

    await prisma.product.update({
      where: { id },
      data: {
        name,
        category: fd.get("category")?.toString() || "other",
        brand: fd.get("brand")?.toString() || null,
        description: fd.get("description")?.toString() || null,
        imageUrl: fd.get("imageUrl")?.toString() || null,
        price: parseInt(fd.get("price")?.toString() || "0"),
        comparePrice: fd.get("comparePrice") ? parseInt(fd.get("comparePrice")!.toString()) : null,
        cost: fd.get("cost") ? parseInt(fd.get("cost")!.toString()) : null,
        stock: parseInt(fd.get("stock")?.toString() || "0"),
        isActive: fd.get("isActive") === "on",
        isFeatured: fd.get("isFeatured") === "on",
        tracksSerial: fd.get("tracksSerial") === "on",
        sortOrder: parseInt(fd.get("sortOrder")?.toString() || "0"),
      },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/shop");
    return { ok: true, savedAt: Date.now() };
  } catch (e) {
    console.error("[updateProduct] failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "儲存失敗（未知錯誤）" };
  }
}

export async function toggleProductActive(id: number) {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return;
  await prisma.product.update({ where: { id }, data: { isActive: !p.isActive } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function toggleProductFeatured(id: number) {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return;
  await prisma.product.update({ where: { id }, data: { isFeatured: !p.isFeatured } });
  revalidatePath("/admin/products");
}

export async function deleteProduct(id: number) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
