-- 第二階段：清理完現有重複之後才執行
CREATE UNIQUE INDEX "AutoArticle_title_key" ON "AutoArticle"("title");
CREATE UNIQUE INDEX "AutoArticle_contentHash_key" ON "AutoArticle"("contentHash");
