"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hashPin } from "@/lib/pos-auth";

export async function createStaff(args: {
  code: string;
  name: string;
  pin: string;
  role: "CASHIER" | "MANAGER";
}) {
  if (!args.code.trim()) return { ok: false, error: "請填代號" };
  if (!args.name.trim()) return { ok: false, error: "請填姓名" };
  if (!/^\d{4,6}$/.test(args.pin)) return { ok: false, error: "PIN 必須是 4-6 位數字" };

  const existing = await prisma.staffMember.findUnique({ where: { code: args.code.trim() } }).catch(() => null);
  if (existing) return { ok: false, error: "代號已被使用" };

  await prisma.staffMember.create({
    data: {
      code: args.code.trim(),
      name: args.name.trim(),
      pinHash: hashPin(args.pin),
      role: args.role,
    },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaff(args: {
  id: number;
  name: string;
  role: "CASHIER" | "MANAGER";
  isActive: boolean;
  newPin?: string;
}) {
  const data: {
    name: string;
    role: string;
    isActive: boolean;
    pinHash?: string;
  } = {
    name: args.name.trim(),
    role: args.role,
    isActive: args.isActive,
  };
  if (args.newPin) {
    if (!/^\d{4,6}$/.test(args.newPin)) return { ok: false, error: "PIN 必須是 4-6 位數字" };
    data.pinHash = hashPin(args.newPin);
  }
  await prisma.staffMember.update({
    where: { id: args.id },
    data,
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function deleteStaff(id: number) {
  // 軟刪除：標 isActive=false（保留歷史銷售記錄）
  await prisma.staffMember.update({
    where: { id },
    data: { isActive: false },
  });
  // 同時 revoke 所有 session
  await prisma.staffSession.updateMany({
    where: { staffId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}
