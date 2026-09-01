# 待辦事項

> 最後更新: 2026-09-01

## 進行中 (0)

## 待處理 (3)

- ⚠️ **兩個 commit 已 push 未部署**（e52a3ad 移除 Watch/AirPods 報價、0b76ae4 爬蟲修復＋文章整理）。
  正確帳號已確認為 **easonhsieh0717**（截圖實證 istyle 在 easonhsieh0717s-projects 底下）；
  本機 CLI 登入的是 admin-63910056 碰不到 → 老闆 `vercel login` 換帳號後 `cd web && vercel --prod`。
  注意：DB 改動（爬蟲資料、文章內容、封面）**已即時生效**，只有程式碼部分待部署。

- 🔑 **需要 Personal Access Token 才能繼續**（2026-09-01）：老闆給的 `vcp_` 是 project-scoped token，
  只能讀 istyle、CLI 完全用不了（whoami/deploy 皆 404）。需到 Account Settings → Tokens
  建立 PAT（scope: easonhsieh0717s-projects），`vercel login --token <PAT>` 後即可一次完成部署＋刪除。
  ⚠️ 舊的 vcp_ token 已外洩在對話紀錄，請老闆撤銷。CLI 目前為登出狀態。

- **待刪除 3 個 Vercel 專案**（2026-09-01 交辦，token 權限不足暫未執行）：
  `dasin-nursing`、`nursing-clock`、`xiaqun`。
  路徑：專案 → Settings → Danger Zone → Delete Project。
  已提醒兩點：(a) 護理專案在 D:\GA\CLAUDE.md 路由表仍標「活躍」且本機有交接文件，
  (b) ⛔ **`dasin-care` 不要動** — 老闆 2026-09-01 明確指示。它在另一帳號 easons-projects-cac5ebe9
      底下（2 天前才更新），名字與 dasin-nursing 相近，任何批次操作都要排除它。

- **通知管道未設定**：爬蟲失敗告警走 notifyOwner()，但 LINE/Telegram env 都沒填 → 目前告警只進 console。
  需老闆提供 Telegram Bot Token（LINE Notify 已停服）。

## 計畫書剩餘項目（OPTIMIZATION_PLAN.md）

已完成 Part B 全部（爬蟲修復＋告警＋陳舊價格），以及使用者臨時追加的 4 項需求。
尚未執行：
- A1 LINE 全站導入（報價詳細頁 LINE 按鈕帶預填訊息、sticky bar、analytics event）
- A2 電話轉換強化（桌機 header 顯示號碼、營業時間內外不同 CTA）
- A3 版面質感、A4 瀏覽率（/booking 表單 0 筆問題調查）

## 已完成 (2026-09-01)

- 三個爬蟲 cron 全部修復並實測：source1 317、source2 403（死 42 天）、source3 688（從未成功）
- cerphone 維修報價 timeout 修復：原本固定只更新 30%，現 138s 跑完 3,977 筆
- 容量解析白名單（「小米 15T」不再被吃成 storage=15TB）、MacBook 保留 RAM 規格
- 下架 500 筆舊 key 重複列；14 天未更新改顯示「LINE 詢價」
- 0 筆不再記 success → error/warning + notifyOwner + cron 回 207
- 維修知識移除所有寫死報價（152 篇自動文章 + 9 個手寫表格 + 257 篇摘要）
- 285 篇文章封面改 Pexels 不重複取圖（原本 11 張圖分 285 篇，單張用 74 次）
- cron 每次至少產 3 篇 + 新增常青保養知識文章類型
- 修 markdown 渲染 bug（粗體的 text-[var(--gold)] 方括號被連結規則吃掉）
- /recycle 改「品牌/機型分組」排序、容量由小到大、加更新日欄位、去除同機型重複列
