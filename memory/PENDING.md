# 待辦事項

> 最後更新: 2026-09-01

## 進行中 (1)

- **官網優化計畫書待老闆確認** — `D:\GA\0424_iStyle\OPTIMIZATION_PLAN.md`，確認後交執行 AI。優先序：0) 部署卡住的 commit → 1) 回收爬蟲修復 → 2) LINE 全站導入

## 待處理 (2)

- ⚠️ **commit e52a3ad 已 push 未部署**（移除 Watch/AirPods 報價 + 下架 screen-repair-cost 文章）。本機 Vercel CLI 帳號（admin-63910056）沒有 istyle 專案，需老闆用正確帳號 `vercel login` 後 `cd web && vercel --prod`
- ⚠️ **回收爬蟲 3 來源死 2 個**：source2 自 7/21、source3 從未成功，都回報 success 0 筆；73% 回收價停在 4/25（詳見計畫書 Part B）

## 已完成 (最近 5 筆)

- 2026-09-01 隱藏 Apple Watch(18) + AirPods(4) 維修報價機型（DeviceModel.isActive=0，DB 即生效，爬蟲 upsert 不會復活）
- 2026-09-01 下架 blog/iphone-screen-repair-cost-2026（含 7 處 relatedSlugs、診斷工具連結、pexels 封面清理、middleware 301 → /quote/apple）— 待部署
- 2026-09-01 機型詳細頁加 isActive 檢查（inactive → 404）— 待部署
