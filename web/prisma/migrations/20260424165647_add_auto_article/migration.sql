-- CreateTable
CREATE TABLE "AutoArticle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImage" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoArticle_slug_key" ON "AutoArticle"("slug");

-- CreateIndex
CREATE INDEX "AutoArticle_kind_idx" ON "AutoArticle"("kind");

-- CreateIndex
CREATE INDEX "AutoArticle_publishedAt_idx" ON "AutoArticle"("publishedAt");
