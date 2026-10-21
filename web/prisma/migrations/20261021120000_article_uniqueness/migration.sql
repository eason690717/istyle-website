-- 第一階段：加欄位（唯一索引要等清掉現有重複後才能建，見 step2.sql）
ALTER TABLE "AutoArticle" ADD COLUMN "subject" TEXT;
ALTER TABLE "AutoArticle" ADD COLUMN "contentHash" TEXT;
