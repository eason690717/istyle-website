# i時代（i-style.store）

板橋手機維修專門店官網與管理系統。

## 功能

- 🏷️ **維修報價系統**：520 機型 × 70 維修項目 = 3,970 筆透明報價
- 🔍 **二手回收估價**：3 站每日比價，取最低，529 機型即時搜尋
- 📅 **線上預約**：維修 / 回收 / 檢測 / 課程，自動 LINE 通知
- 🛠️ **服務著陸頁**：7 個 SEO 長尾頁面（iPhone 螢幕、電池、iPad、MacBook、Switch、Dyson…）
- 📸 **維修案例**：Before/After 真實照片
- ⭐ **客戶評價**：8 則 + AggregateRating Schema
- 🗺️ **Google Maps**：嵌入式地圖 + 一鍵導航/通話
- 🤖 **GEO/SEO**：JSON-LD（LocalBusiness、Service、FAQPage、Review、BreadcrumbList）+ llms.txt + sitemap
- 🎨 **黑金設計**：Noto Serif/Sans TC，跟 logo 一致
- 👤 **後台管理**：儀表板 / 預約 / 訂單 / 報價 / 回收 / 設定（Basic Auth）

## 技術棧

| 層 | 選型 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| ORM | Prisma 7 |
| DB | SQLite（本機）/ Turso libSQL（雲端） |
| 樣式 | Tailwind 4 |
| 部署 | Vercel |
| 排程 | Vercel Cron |
| 金流 | 綠界 ECPay（待設定） |
| 通知 | LINE Messaging API（待設定） |

## 目錄

```
D:\GA\0424_iStyle\
├── web/                     ⭐ Next.js 應用本體
│   ├── prisma/              schema + seed
│   ├── src/
│   │   ├── app/             頁面（含 admin、api/cron）
│   │   ├── components/      共用元件
│   │   ├── lib/             prisma、site-config、recycle 爬蟲
│   │   └── generated/prisma Prisma 7 生成的 client
│   └── public/              logo、cases 照片
├── scripts/                 Python 爬蟲（cerphone、wsphone、istyle 舊站）
├── data/                    抓取結果（不入 git）
├── DEPLOY.md                部署指南
└── README.md
```

## 開發

```bash
cd web
npm install
npx prisma migrate dev   # 第一次
npx tsx prisma/seed.ts   # 灌資料
npm run dev              # localhost:3000
```

詳細部署步驟見 [DEPLOY.md](./DEPLOY.md)。
