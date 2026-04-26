"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "istyle_admin";

export async function loginAction({ user, pwd, from }: { user: string; pwd: string; from?: string }) {
  const expectedUser = process.env.ADMIN_USER || "admin@i-style.store";
  const expectedPwd = process.env.ADMIN_PASSWORD || "istyle2026Secure";

  if (user.trim() !== expectedUser || pwd !== expectedPwd) {
    return { error: "帳號或密碼錯誤" };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expectedPwd, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });

  redirect(from && from.startsWith("/admin") ? from : "/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
