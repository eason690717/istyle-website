import Image from "next/image";
import { LoginForm } from "./login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "後台登入",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ from?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-8">
        <div className="text-center">
          <Image src="/logo.png" alt="i時代" width={80} height={80} className="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-4 font-serif text-2xl text-[var(--gold)]">i時代 後台</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">店家管理系統</p>
        </div>
        <LoginForm from={sp.from} initialError={sp.error} />
      </div>
    </div>
  );
}
