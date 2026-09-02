// 後台／POS／行動站的 root layout — 純淨布局，沒有前台 chrome。
//
// 與 (site) 分成兩個 route group、各自擁有 root layout，是為了讓公開頁能被靜態快取：
// 舊版用單一 root layout + headers() 讀 x-pathname 判斷要不要顯示 chrome，
// 但只要 root layout 讀了請求資訊，Next.js 就無法快取任何頁面，
// 導致每個爬蟲請求都跑一次完整 SSR（實測一個月燒掉 6 小時 CPU，額度只有 4 小時）。
import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "../globals.css";
import { ToastContainer } from "@/components/toast";

const notoSans = Noto_Sans_TC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// 內部頁一律不給搜尋引擎索引
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${notoSans.variable} ${notoSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--fg)] antialiased">
        <main className="flex-1">{children}</main>
        <ToastContainer />
      </body>
    </html>
  );
}
