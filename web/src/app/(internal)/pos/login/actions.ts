"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { POS_COOKIE, POS_SESSION_HOURS, loginStaff, logoutStaff } from "@/lib/pos-auth";

export async function loginAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const pin = String(formData.get("pin") || "").trim();

  if (!code || !pin) return { error: "請輸入店員代號與 PIN" };

  const r = await loginStaff(code, pin);
  if (!r.ok || !r.token) return { error: "代號或 PIN 不正確" };

  const cs = await cookies();
  cs.set(POS_COOKIE, r.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: POS_SESSION_HOURS * 3600,
  });

  redirect("/pos");
}

export async function logoutAction() {
  const cs = await cookies();
  const token = cs.get(POS_COOKIE)?.value;
  if (token) await logoutStaff(token);
  cs.delete(POS_COOKIE);
  redirect("/pos/login");
}
