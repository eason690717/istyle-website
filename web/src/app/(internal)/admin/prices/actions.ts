"use server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME } from "@/lib/admin-auth";

// 從 session DB 找出哪個 admin 在動作（之後變更紀錄裡會留 email）
async function getAdminEmail(): Promise<string> {
  const cs = await cookies();
  const tok = cs.get(COOKIE_NAME)?.value;
  if (!tok) return "unknown";
  const sess = await prisma.adminSession.findUnique({ where: { token: tok } }).catch(() => null);
  return sess?.user || "unknown";
}

export async function setOverride(args: {
  priceId: number;
  manualOverride: number;
  reason: string;
}) {
  if (!args.reason.trim()) return { ok: false, error: "請填寫異動原因" };
  if (args.manualOverride < 0) return { ok: false, error: "金額不可負數" };

  const adminEmail = await getAdminEmail();

  await prisma.repairPrice.update({
    where: { id: args.priceId },
    data: {
      manualOverride: args.manualOverride,
      overrideReason: args.reason.trim().slice(0, 200),
      overriddenAt: new Date(),
      overriddenBy: adminEmail,
    },
  });

  revalidatePath("/admin/prices");
  return { ok: true };
}

export async function clearOverride(priceId: number) {
  await prisma.repairPrice.update({
    where: { id: priceId },
    data: {
      manualOverride: null,
      overrideReason: null,
      overriddenAt: null,
      overriddenBy: null,
    },
  });
  revalidatePath("/admin/prices");
  return { ok: true };
}
