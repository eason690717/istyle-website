import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";
import { LoginForm } from "./login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POS 結帳台",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PosLoginPage() {
  // 已登入直接導 /pos
  const cs = await cookies();
  const tok = cs.get(POS_COOKIE)?.value;
  const valid = await verifyStaffSession(tok);
  if (valid) redirect("/pos");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0d0908] via-[#1a1410] to-[#0d0908] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--gold)] text-3xl">
            🛒
          </div>
          <h1 className="mt-4 font-serif text-2xl text-[var(--gold)]">POS 結帳台</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">店員登入</p>
        </div>
        <div className="glass-card mt-6 rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
