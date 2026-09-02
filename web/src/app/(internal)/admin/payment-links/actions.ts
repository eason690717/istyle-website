"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";

export async function createPaymentLink(fd: FormData) {
  const itemName = fd.get("itemName")?.toString().trim();
  const amount = parseInt(fd.get("amount")?.toString() || "0");
  const customerName = fd.get("customerName")?.toString().trim() || null;
  const customerPhone = fd.get("customerPhone")?.toString().trim() || null;
  const customerEmail = fd.get("customerEmail")?.toString().trim() || null;
  const description = fd.get("description")?.toString().trim() || null;
  const expiresHours = parseInt(fd.get("expiresHours")?.toString() || "48");

  if (!itemName || !amount || amount < 1) return;

  const token = randomBytes(8).toString("base64url");
  const expiresAt = new Date(Date.now() + expiresHours * 3600_000);

  await prisma.paymentLink.create({
    data: {
      token,
      amount,
      itemName,
      description,
      customerName,
      customerPhone,
      customerEmail,
      status: "PENDING",
      expiresAt,
    },
  });

  revalidatePath("/admin/payment-links");
  redirect("/admin/payment-links");
}
