# 0424_iStyle

## 啟動流程

1. 讀取 `memory/MEMORY.md` — 本專案記憶索引
2. 讀取 `memory/PENDING.md` — 當前待辦
3. 按任務需要讀取 `memory/project_*.md` 或 `memory/reference_*.md`

## 開發規則

### 品質與判斷
- 只把 Claude 用於需要判斷的任務（分類、起草、摘要、抽取）
- 確定性決策（重試 503、路由、status code）用一般程式碼處理
- Token budget：單任務 4,000 tokens、單 session 30,000 tokens 上限
- 接近 budget 時主動摘要重啟，不要無聲突破

### 程式碼紀律
- 寫程式碼前先讀懂：讀檔案 exports、直接 caller、共用 utility
- 「看起來無關」是最危險的措辭，不確定就要問
- 兩個衝突的程式碼模式要「點明選一個」，解釋為什麼，標記另一個待清理
- 配合既有 codebase 慣例（snake_case 就 snake_case），不認同另開討論

### 驗證與回報
- 測試要驗證「意圖」不只「行為」— 業務邏輯改變時測試要會失敗才合格
- 多步驟任務要 checkpoint — 每完成一步總結「做了什麼、驗證了什麼、剩什麼」
- 失敗要大聲 — 跳過 30 筆不能說「migration 完成」，跳過測試不能說「測試通過」
- 預設「主動揭露不確定」，不要「藏起不確定」

### 記憶管理
- 完成任務後更新 `memory/PENDING.md`
- 重要決策記錄到 `memory/project_*.md`
- 踩坑經驗記錄到 `memory/reference_*.md`
- 使用者偏好記錄到 `memory/feedback_*.md`
