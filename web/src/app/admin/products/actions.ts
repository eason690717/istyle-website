"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[\s_/\\.,'"`]+/g, "-")
    .replace(/[^a-z0-9一-鿿-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createProduct(fd: FormData) {
  const name = fd.get("name")?.toString().trim();
  if (!name) throw new Error("商品名稱必填");
  let slug = fd.get("slug")?.toString().trim() || slugify(name);
  // 確保 slug unique
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
      sortOrder: parseInt(fd.get("sortOrder")?.toString() || "0"),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/products/${product.id}`);
}

export async function updateProduct(id: number, fd: FormData) {
  const name = fd.get("name")?.toString().trim();
  if (!name) throw new Error("商品名稱必填");

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
      sortOrder: parseInt(fd.get("sortOrder")?.toString() || "0"),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/shop");
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
