import type { Metadata } from "next";
import { CartView } from "./cart-view";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "訂單清單",
  description: `${SITE.name}．確認您要送修的項目，下一步進入結帳`,
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
        <span className="gold-underline">送修清單</span>
      </h1>
      <p className="mt-4 text-sm text-[var(--fg-muted)]">
        確認項目後即可結帳。配送方式（自取／7-11／宅配）下一步選擇。
      </p>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
