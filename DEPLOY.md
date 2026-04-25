# i時代 部署指南

## 開發環境

```bash
cd web
npm install
npx prisma migrate dev   # 第一次跑會建立 dev.db
npx tsx prisma/seed.ts   # 灌入 4,147 筆 cerphone 報價
npm run dev              # http://localhost:3000
```

## 部署到 Vercel（生產環境）

### 1. 建立 Turso 資料庫（免費）

1. 註冊 https://turso.tech
2. 建立資料庫：
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth signup
   turso db create istyle
   turso db show istyle --url        # → 取得 TURSO_DATABASE_URL
   turso db tokens create istyle     # → 取得 TURSO_AUTH_TOKEN
   ```
3. 把 schema 套到 Turso：
   ```bash
   cd web
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." \
     npx prisma migrate deploy
   ```
4. 灌入種子資料：
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." \
     npx tsx prisma/seed.ts
   ```

### 2. 推到 GitHub

```bash
cd D:\GA\0424_iStyle
git init   # 已執行
git add web/ scripts/ DEPLOY.md README.md .gitignore
git commit -m "Initial commit"
git remote add origin git@github.com:YOUR_USERNAME/istyle.git
git push -u origin main
```

### 3. Vercel 部署

1. 進 https://vercel.com/new
2. Import GitHub repo
3. **Root Directory** 選 `web`
4. Framework Preset 自動偵測為 Next.js
5. **Environment Variables** 填入（從 `.env.example` 複製）：
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_USER` / `ADMIN_PASSWORD`
   - `CRON_SECRET`（隨機長字串）
   - `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_OWNER_USER_ID`（之後串）
   - `ECPAY_*`（之後串）
6. Deploy

### 4. 接手 i-style.store 網域

1. 在 Vercel 專案 Settings → Domains 新增 `www.i-style.store` 和 `i-style.store`
2. Vercel 會給您兩條 DNS 記錄
3. 到 Namecheap 後台改 DNS：
   - 刪除原本指向 EasyStore 的 A / CNAME（共 6 條）
   - 保留 google-site-verification TXT（2 條）
   - **不動 MAIL SETTINGS（Gmail 設定）**
   - 新增 Vercel 給的 A `@ → 76.76.21.21` 和 CNAME `www → cname.vercel-dns.com`
4. 等 DNS 傳播（通常 < 1 小時）
5. 觀察 1-2 週後再退訂 EasyStore

### 5. Cron 設定

Vercel 已透過 `vercel.json` 設定每日 18:00 UTC（台灣 02:00）自動更新二手回收價。
首次部署後可手動觸發測試：
```
GET https://www.i-style.store/api/cron/refresh-recycle?secret=YOUR_CRON_SECRET
```

## 後台

- URL：`https://www.i-style.store/admin`
- 預設帳號：`admin@i-style.store`
- 預設密碼：`istyle2026`（請改 `ADMIN_PASSWORD`）

## 維護常用指令

```bash
# 重新跑 cerphone 報價更新
cd D:\GA\0424_iStyle
python scripts/cerphone_scrape_all.py     # 抓最新 cerphone
cd web
TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." npx tsx prisma/seed.ts

# 視覺化查看 DB
npx prisma studio

# 部署新版本（push GitHub 即自動觸發）
git push
```
