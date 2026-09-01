# i-style.store 官網優化計畫書

> 撰寫日期：2026-09-01
> 目的：提升瀏覽率與版面質感、引導客人電話/LINE 聯繫（LINE 官方帳號優先）、修復報價全自動更新
> 使用方式：本文件為交付給執行 AI 的完整規格，所有現況數據皆於 2026-09-01 實際查證

---

## 0. 前置事項（執行任何優化前先處理）

### 0-1. ⚠️ 有一個 commit 已推上 GitHub 但未部署

commit `e52a3ad`（移除 Watch/AirPods 報價表格 + 下架 iphone-screen-repair-cost-2026 文章）已 push 到 main，但 **Vercel 未部署**：

- git push 不會觸發 Vercel 自動部署（此專案無 GitHub integration，已實測等 4 分鐘無反應）
- 本機 Vercel CLI 登入的帳號是 `admin-63910056`（team: easons-projects-cac5ebe9），底下只有 dasin-care、love-empire 兩個專案，**沒有 istyle**
- `web/.vercel/project.json` 指向 `team_SBQh5lk2xdBZyifyycwWSLsq` / projectId `prj_C8Kh4BSj09p2hRETfUOLMOMHJlvG`，現帳號無權限

**需要老闆本人操作**：用擁有 istyle 專案的 Vercel 帳號重新 `vercel login`，之後執行 AI 才能 `cd web && vercel --prod`。

部署後驗收：
- `https://www.i-style.store/blog/iphone-screen-repair-cost-2026` → 301 到 /quote/apple（現在還是 200）
- `https://www.i-style.store/quote/apple/apple-airpods-pro-2` → 404（現在還是 200）
- DB 部分已生效：/quote/apple 矩陣已無 Apple Watch / AirPods 區塊 ✅

### 0-2. 通知系統目前是空的

`notifyOwner()` 三層備援存在，但 LINE / Telegram env 都沒設定 → 目前**任何告警都送不出去**。Part B 的爬蟲告警依賴此項，需要老闆提供 Telegram Bot Token（LINE Notify 已終止服務，建議直接用 Telegram，老闆 Telegram: easonplay）。

---

## 1. 現況數據（2026-09-01 查證）

### 流量（自建 analytics，Turso PageView 表）

| 區塊 | 近 30 天 PV | 近 90 天 PV | 判讀 |
|---|---:|---:|---|
| /quote 維修報價 | 1,626 | 6,616 | 🥇 全站流量主力 |
| /blog 維修知識 | 1,185 | 3,588 | 🥈 SEO 長尾成功，285 篇自動文章 |
| / 首頁 | 364 | 1,734 | 健康 |
| /recycle 回收 | 184 | 1,278 | 健康 |
| /services | 173 | 516 | OK |
| /courses | 138 | 566 | OK |
| /local 地區頁 | 123 | 486 | 5 月時是 0，SEO 修法已見效 |
| /shop 商城 | 118 | 2,659 | 90 天內有大量重複瀏覽（216 訪客 2,659 PV，多為自己人測試） |
| /booking 預約 | 60 | 660 | ⚠️ 見下 |
| 總計 | **4,042 PV / 2,685 訪客** | 18,856 PV / 7,441 訪客 | 比 5 月（601 PV/30 天）成長 6.7 倍 |

### 轉換相關事件（近 90 天）

- `exit_intent_shown` 2,210 次 → `exit_intent_line_clicked` 206 次（**9.3% 轉 LINE，這招有效**）
- `upgrade_tool_calculated` 182 次
- ⚠️ **Booking 資料表 0 筆（從開站至今）**：/booking 有 660 PV 卻沒有任何一筆預約寫入。代碼看起來會寫 DB（`web/src/app/booking/actions.ts:65`），但從未有成功案例 → 需要 end-to-end 實測表單是否真的能送出，或是客人根本不想填表單（傾向直接 LINE/電話）

### 報價自動更新現況（老闆以為沒在跑，實際查證結果）

Vercel Cron 已配置且**確實每天在跑**（`web/vercel.json`，4 個排程），不依賴本機：

| Cron | 排程 (UTC) | 實際狀態 |
|---|---|---|
| /api/cron/refresh-recycle | 每日 18:00（台北 02:00） | 🟡 有跑，但 3 來源死 2 個（見下） |
| /api/cron/generate-articles | 每日 19:00 | ✅ 正常（AutoArticle 285 篇） |
| /api/cron/refresh-prices（維修報價） | 每日 20:00 | ✅ **正常**，8/31 更新 1,223 筆 RepairPrice，CerphoneScrapeLog 全 success |
| /api/cron/low-stock-alert | 每日 01:00 | 有跑（但通知送不出去，見 0-2） |

**維修報價已經是全自動每日更新，不用修。** 真正的問題在回收報價：

| 回收來源 | 最後一次抓到資料 | 現況 |
|---|---|---|
| source1 | 2026-08-31（每天 317 筆） | ✅ 唯一活著的 |
| source2 | **2026-07-21**（死了 42 天） | ❌ 每天回 0 筆卻記 "success" |
| source3 | **從未成功**（log 保留期內 0 筆） | ❌ 同上 |

後果：2,023 個上架回收機型中，只有 ~301 個在 8/31 更新過；**1,473 個（73%）的價格還停在 4/25**。最低價演算法建立在 3 來源比價上，現在只剩 1 個來源，報價可信度受損。來源設定在 `web/src/lib/recycle/sources.ts`（second3c.com.tw 等）。

---

## 2. Part A — 轉換與質感優化（LINE 導入優先）

### A1. LINE 官方帳號全站導入 🥇 最優先

exit-intent 已證明 9.3% 的人願意點 LINE，但目前 LINE 入口只有 floating CTA 和 exit-intent。目標：**讓每一個看到價格的人，下一步就是加 LINE**。

1. **報價詳細頁（/quote/[brand]/[model]）加「LINE 詢問此報價」按鈕**
   - 位置：價格表正下方 + 手機版 sticky bottom bar（LINE 綠 + 電話金，兩鍵並排）
   - LINE 連結帶預填訊息（`https://line.me/R/oaMessage/{LINE_ID}/?{urlencoded 機型+項目}`），客人點進來訊息已寫好「我想詢問 iPhone 15 Pro 螢幕維修 $X,XXX」→ 店家秒懂、回覆率高
2. **報價矩陣頁（/quote/[brand]）表格上方加常駐 LINE bar**：「線上價格每日更新，加 LINE 確認現貨與到府收送」
3. **回收頁（/recycle）估價結果卡片**加「LINE 傳序號拍照估價」按鈕（回收本來就要看機況，天然的 LINE 轉換點）
4. **Blog 文章底部**（285 篇自動文章 + 手寫文章共用 layout）加 LINE 好友卡片：加好友送「螢幕維修折 $100」之類的誘因（誘因金額由老闆定）
5. **加好友誘因機制**：LINE 官方帳號設定歡迎訊息送優惠碼（LINE OA 後台操作，執行 AI 提供文案，老闆設定）
6. **全部 LINE 點擊打 analytics event**（`line_click`，帶 page 參數）— 沿用現有自建 analytics，一週後可比較各入口成效

### A2. 電話轉換強化

- 手機版報價頁 sticky bar 的電話鍵直接 `tel:` 撥號（現有 floating-cta 已有，但報價內容頁優先級要高於通用 floating）
- 桌機版電話號碼常駐 header（現在只有「預約來電」按鈕，號碼本身不可見 — 桌機用戶要拿手機撥號，看得到號碼才撥得出去）
- 營業時間內/外顯示不同 CTA：營業中顯示「現在來電 立即報價」，非營業時間顯示「LINE 留言 開店優先回覆」

### A3. 版面質感

原則：不改品牌方向（黑金、Noto Serif/Sans TC），只做一致性與細節收斂。

1. **首頁改版重點**
   - Hero 區塊用真實店面/維修過程照片（老闆已提供過真實照片素材，在 /cases 目錄）取代 stock 感重的圖
   - 客戶評價區上移（社會證明優先於服務清單）；Google 評價星數/則數 badge 化，點擊導 Google Maps 評論
   - 6 張服務卡片統一視覺密度（現況卡片內容長短不一）
2. **全站一致性 pass**：圓角、陰影、間距、金色使用時機統一成 design token（globals.css 已有 CSS variables，逐頁套用檢查）
3. **手機優先**：85% 維修客用手機查價。報價矩陣表手機版橫向捲動體驗、字級、凍結欄檢查；iOS Safari 與 LINE 內建瀏覽器實測（既有專案原則）
4. **圖片**：全站掃一遍非 next/image 的 `<img>`、缺 lazy loading、缺 alt 的圖

### A4. 瀏覽率（降跳出、加深瀏覽）

1. **Blog → 報價深連結**：285 篇自動文章目前是流量入口但轉換出口 — 文章內文自動插入相關機型報價卡（依文章 slug 對應機型），把 SEO 流量導進 /quote
2. **RelatedReading 覆蓋檢查**：確認 5 大頁面 + blog 全部有掛，並把「回收估價 → 維修報價」互導（回收客常是維修潛在客，反之亦然）
3. **/booking 表單調查與簡化**：
   - 先 end-to-end 實測表單能否成功送出（Booking 表 0 筆是紅旗）
   - 若功能正常但沒人填 → 縮成 3 欄位（姓名/電話/需求），或整頁改為「LINE 預約優先」引導
4. **首頁入口整理**：hero 下方入口卡確認涵蓋六大流量頁（quote/recycle/shop/courses/blog/booking）

### A5. 明確不做（本計畫排除）

- 不動 /shop 商城結構、金流、物流（另有 Phase 計畫）
- 不動後台/POS/庫存
- 不加新頁面路由（先把現有流量頁做深）

---

## 3. Part B — 報價全自動更新修復

> 重申現況：維修報價每日自動更新**已正常運作**；回收報價 cron 有跑但 3 來源死 2 個。所謂「沒有自動啟動」實際是「有啟動、但壞掉時不吭聲」。

### B1. 修復 source2 / source3 回收爬蟲

- 逐一開啟 `web/src/lib/recycle/sources.ts` 中的來源網址，檢查對方是否改版/改 URL/上 Cloudflare
- 修復 selector 或更換等效來源（若原站已收掉，找替代的公開回收價網站，需老闆確認來源合法性與適用性）
- 本機先用 `web/scripts/refresh-recycle-local.mjs` 驗證能抓到合理筆數再部署

### B2. 「0 筆 = 失敗」告警（失敗要大聲）

- `refresh-recycle` 改判定：任一來源 recordCount 低於門檻（如前 7 日平均的 50%，或絕對值 < 10）→ log 記 `warning/failed` 而非 `success`
- 後台首頁 banner 比照維修爬蟲監控（CerphoneScrapeLog banner 已有現成模式可抄）加回收爬蟲狀態
- 接 `notifyOwner()` 發 Telegram（依賴 0-2 老闆提供 bot token）

### B3. 陳舊價格處理（誠實展示）

- RecyclePrice 有 `source1At/2At/3At` 時間戳：minPrice 演算改為**只採用 N 天內的來源價**（建議 N=14），全部過期則該機型顯示「請 LINE 詢價」而非過期價格
- 前台回收卡片顯示「報價更新於 X/X」，過期價不再假裝是今日價
- 這同時是 A1-3 的 LINE 轉換點：過期機型的 CTA 就是「LINE 拍照估價」

### B4. 頻率調整

- 老闆要求「每週自動更新」— 現況已是**每日**，優於需求，建議維持每日不動
- 唯 source2/3 修復後首次執行需人工核對 20 筆抽樣價格合理性（爬錯欄位比不更新更危險）

### B5. 驗收標準

1. 連續 7 天 RecycleScrapeLog 三來源 recordCount 均 > 門檻
2. `SELECT COUNT(*) FROM RecyclePrice WHERE isAvailable=1 AND date(lastUpdatedAt) < date('now','-14 day')` 趨近 0（或這些機型前台已顯示「LINE 詢價」）
3. 手動塞一筆 0 筆結果 → 後台 banner 變紅 + Telegram 收到通知
4. 維修報價 cron 不動（已正常，別碰）

---

## 4. 優先順序與建議排程

| 順位 | 項目 | 理由 | 規模 |
|---|---|---|---|
| 0 | 部署卡住的 commit（0-1，需老闆 vercel login） | 已完成的工作未上線 | 5 分鐘 |
| 1 | B1+B2 回收爬蟲修復＋告警 | 現在網站上 73% 回收價是 4 月的錯誤資訊 | 1 個工作天 |
| 2 | A1 LINE 全站導入（含 event 追蹤） | 老闆指定優先；有 9.3% 實證轉換率 | 1 個工作天 |
| 3 | B3 陳舊價格誠實展示 | 與 A1 的回收 LINE 詢價 CTA 綁一起做 | 0.5 天 |
| 4 | A2 電話轉換 + A4-3 booking 調查 | 轉換鏈補完 | 0.5 天 |
| 5 | A3 版面質感 + A4 瀏覽率 | 面子工程放最後，先賺錢再變漂亮 | 1-2 天 |

每一順位完成即獨立部署驗證（不要囤一大包）。

## 5. 給執行 AI 的注意事項（本 repo 既有慣例）

1. **部署**：git push 不會觸發 Vercel 部署，改完必須 `cd web && vercel --prod` 並 curl 驗證（見 memory/feedback_verify_before_handoff）
2. **DB migration**：`prisma migrate dev` 不能用，手寫 SQL + `apply-*-migration.mjs` 模式套到 Turso（見 memory/reference_migration_workflow）
3. **env**：所有 env 讀取一律 `.trim()`；不要在 module-level cache env 值
4. **commit**：需帶 `-c user.name="iStyle Admin" -c user.email="admin@i-style.store"`
5. **Next.js 16**：先讀 `web/node_modules/next/dist/docs/` 相關章節再動手；中文 slug 會 404
6. **跨平台**：改前台 UI 必須考慮 iOS Safari 與 LINE 內建瀏覽器
7. **失敗要大聲**：任何「跑了但 0 筆」「跳過 N 筆」都要記 log + 上報，不准 success
