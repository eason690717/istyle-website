import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "@/lib/admin-auth";
import { logoutAction } from "./login/actions";
import { AdminShell } from "./_shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "i時代 後台",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const ok = await verifySession(token);
    if (!ok) {
      cookieStore.delete(COOKIE_NAME);
      redirect("/admin/login");
    }
  } else {
    return <>{children}</>;
  }

  return <AdminShell logoutAction={logoutAction}>{children}</AdminShell>;
}
