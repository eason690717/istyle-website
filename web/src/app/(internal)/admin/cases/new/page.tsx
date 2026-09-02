import Link from "next/link";
import { CaseForm } from "../case-form";

export default function NewCasePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/cases" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回案例列表</Link>
      <h1 className="mt-2 mb-6 font-serif text-2xl text-[var(--gold)]">新增維修案例</h1>
      <CaseForm />
    </div>
  );
}
