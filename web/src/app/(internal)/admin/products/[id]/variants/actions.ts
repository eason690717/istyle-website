"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createVariant(productId: number, fd: FormData) {
  const name = fd.get("name")?.toString().trim();
  if (!name) throw new Error("變體名稱必填");
  await prisma.productVariant.create({
    data: {
      productId,
      name,
      optionValues: fd.get("optionValues")?.toString() || null,
      price: parseInt(fd.get("price")?.toString() || "0"),
      comparePrice: fd.get("comparePrice") ? parseInt(fd.get("comparePrice")!.toString()) : null,
      cost: fd.get("cost") ? parseInt(fd.get("cost")!.toString()) : null,
      stock: parseInt(fd.get("stock")?.toString() || "0"),
      sku: fd.get("sku")?.toString() || null,
      imageUrl: fd.get("imageUrl")?.toString() || null,
      sortOrder: parseInt(fd.get("sortOrder")?.toString() || "0"),
      isActive: true,
    },
  });
  revalidatePath(`/admin/products/${productId}/variants`);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
}

export async function updateVariant(variantId: number, fd: FormData) {
  const v = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!v) throw new Error("找不到");
  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      name: fd.get("name")?.toString().trim() || v.name,
      price: parseInt(fd.get("price")?.toString() || String(v.price)),
      comparePrice: fd.get("comparePrice") ? parseInt(fd.get("comparePrice")!.toString()) : v.comparePrice,
      stock: parseInt(fd.get("stock")?.toString() || String(v.stock)),
      sku: fd.get("sku")?.toString() || v.sku,
      imageUrl: fd.get("imageUrl")?.toString() || v.imageUrl,
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath(`/admin/products/${v.productId}/variants`);
  revalidatePath("/shop");
}

export async function deleteVariant(variantId: number) {
  const v = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!v) return;
  await prisma.productVariant.delete({ where: { id: variantId } });
  revalidatePath(`/admin/products/${v.productId}/variants`);
  revalidatePath("/shop");
}
