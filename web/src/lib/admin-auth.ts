// 後台 Auth：random session token + DB 紀錄 + 防爆破
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export const COOKIE_NAME = "istyle_sess";
export const SESSION_DAYS = 7;

// 隨機 token（256 bit）
export function genToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// constant-time string compare（防 timing attack）
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// 建立 session
export async function createSession(args: {
  user: string;
  ip?: string;
  userAgent?: string;
}): Promise<string> {
  const token = genToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.adminSession.create({
    data: {
      token,
      user: args.user,
      ip: args.ip || null,
      userAgent: args.userAgent?.slice(0, 500) || null,
      expiresAt,
    },
  });
  return token;
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const sess = await prisma.adminSession.findUnique({ where: { token } }).catch(() => null);
  if (!sess) return false;
  if (sess.revokedAt) return false;
  if (sess.expiresAt < new Date()) return false;
  return true;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  }).catch(() => {});
}

// 紀錄登入嘗試
export async function logAttempt(args: {
  ip: string;
  user?: string;
  success: boolean;
  reason?: string;
  userAgent?: string;
}) {
  await prisma.loginAttempt.create({
    data: {
      ip: args.ip,
      user: args.user || null,
      success: args.success,
      reason: args.reason || null,
      userAgent: args.userAgent?.slice(0, 500) || null,
    },
  }).catch(() => {});
}

// 防爆破：過去 15 分鐘同 IP 失敗 5 次 → 鎖
export async function isIpLocked(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60_000);
  const fails = await prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  }).catch(() => 0);
  return fails >= 5;
}

// 取 client IP（Vercel headers）
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
