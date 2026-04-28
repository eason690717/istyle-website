// POS 店員認證 — PIN-based 登入，session 存 DB
// 設計原則：跟產業無關（手機維修 / 餐飲 / 通用零售都能用）
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export const POS_COOKIE = "istyle_staff";
export const POS_SESSION_HOURS = 12;  // 一個營業班次

const PIN_SALT = (process.env.STAFF_PIN_SALT || "istyle-pos-default").trim();

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin + PIN_SALT).digest("hex");
}

export function genToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function loginStaff(code: string, pin: string): Promise<{ ok: boolean; token?: string; staff?: { id: number; name: string; role: string } }> {
  const staff = await prisma.staffMember.findUnique({
    where: { code: code.trim() },
  }).catch(() => null);
  if (!staff || !staff.isActive) return { ok: false };
  if (staff.pinHash !== hashPin(pin)) return { ok: false };

  const token = genToken();
  await prisma.staffSession.create({
    data: {
      token,
      staffId: staff.id,
      expiresAt: new Date(Date.now() + POS_SESSION_HOURS * 3600_000),
    },
  });
  return { ok: true, token, staff: { id: staff.id, name: staff.name, role: staff.role } };
}

export async function verifyStaffSession(token: string | undefined | null) {
  if (!token) return null;
  const sess = await prisma.staffSession.findUnique({
    where: { token },
    include: { staff: true },
  }).catch(() => null);
  if (!sess) return null;
  if (sess.revokedAt) return null;
  if (sess.expiresAt < new Date()) return null;
  if (!sess.staff.isActive) return null;
  return { staffId: sess.staff.id, name: sess.staff.name, role: sess.staff.role, code: sess.staff.code };
}

export async function logoutStaff(token: string) {
  await prisma.staffSession.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  }).catch(() => {});
}
