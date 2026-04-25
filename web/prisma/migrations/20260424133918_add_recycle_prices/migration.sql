-- CreateTable
CREATE TABLE "RecyclePrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modelKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "storage" TEXT,
    "variant" TEXT,
    "source1Price" INTEGER,
    "source1At" DATETIME,
    "source2Price" INTEGER,
    "source2At" DATETIME,
    "source3Price" INTEGER,
    "source3At" DATETIME,
    "minPrice" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "searchKeywords" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecycleScrapeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "durationMs" INTEGER,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RecyclePrice_modelKey_key" ON "RecyclePrice"("modelKey");

-- CreateIndex
CREATE INDEX "RecyclePrice_category_idx" ON "RecyclePrice"("category");

-- CreateIndex
CREATE INDEX "RecyclePrice_brand_idx" ON "RecyclePrice"("brand");

-- CreateIndex
CREATE INDEX "RecyclePrice_minPrice_idx" ON "RecyclePrice"("minPrice");
