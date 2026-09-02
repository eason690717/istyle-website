"use server";
// 帳密 / IP 白名單登入已廢棄，全面改 Google OAuth (/api/auth/google)
// 此檔案只保留 logoutAction 給 admin layout 用
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, revokeSession } from "@/lib/admin-auth";

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await revokeSession(token);
  }
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
