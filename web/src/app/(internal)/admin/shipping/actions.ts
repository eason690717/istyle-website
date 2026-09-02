"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyOwner } from "@/lib/notify";

export async function markShipped(args: {
  paymentLinkId: number;
  shippingProvider: string;
  trackingNumber: string;
  shippingNote?: string;
}) {
  if (!args.trackingNumber.trim()) return { ok: false, error: "請填運單號" };

  const link = await prisma.paymentLink.update({
    where: { id: args.paymentLinkId },
    data: {
      shippingProvider: args.shippingProvider.trim(),
      trackingNumber: args.trackingNumber.trim(),
      shippingNote: args.shippingNote?.trim() || null,
      shippedAt: new Date(),
    },
  });

  // 通知老闆已標記
  notifyOwner([
    "📦 已出貨",
    `客戶：${link.customerName} ${link.customerPhone}`,
    `${args.shippingProvider} 運單：${args.trackingNumber}`,
    args.shippingNote ? `備註：${args.shippingNote}` : "",
  ].filter(Boolean).join("\n")).catch(console.error);

  revalidatePath("/admin/shipping");
  return { ok: true };
}

export async function unmarkShipped(paymentLinkId: number) {
  await prisma.paymentLink.update({
    where: { id: paymentLinkId },
    data: { shippedAt: null },
  });
  revalidatePath("/admin/shipping");
  return { ok: true };
}
