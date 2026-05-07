CREATE TABLE "CerphoneScrapeLog" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "scope" TEXT NOT NULL,
  "brand" TEXT,
  "status" TEXT NOT NULL,
  "recordCount" INTEGER NOT NULL DEFAULT 0,
  "priceUpserts" INTEGER,
  "modelUpserts" INTEGER,
  "itemUpserts" INTEGER,
  "errorMsg" TEXT,
  "durationMs" INTEGER,
  "startedAt" DATETIME NOT NULL,
  "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CerphoneScrapeLog_scope_finishedAt_idx" ON "CerphoneScrapeLog"("scope", "finishedAt");
CREATE INDEX "CerphoneScrapeLog_finishedAt_idx" ON "CerphoneScrapeLog"("finishedAt");
