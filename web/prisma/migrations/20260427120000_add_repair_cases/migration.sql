CREATE TABLE "RepairTicket" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "ticketNumber" TEXT NOT NULL UNIQUE,
  "customerName" TEXT NOT NULL,
  "phoneLast4" TEXT NOT NULL,
  "deviceModel" TEXT NOT NULL,
  "issueDescription" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "estimatedCost" INTEGER,
  "finalCost" INTEGER,
  "estimatedDoneAt" DATETIME,
  "pickedUpAt" DATETIME,
  "timeline" TEXT NOT NULL DEFAULT '[]',
  "internalNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "RepairTicket_ticketNumber_idx" ON "RepairTicket"("ticketNumber");
CREATE INDEX "RepairTicket_phoneLast4_idx" ON "RepairTicket"("phoneLast4");
CREATE INDEX "RepairTicket_createdAt_idx" ON "RepairTicket"("createdAt");

CREATE TABLE "CaseStudy" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "deviceModel" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "beforePhotos" TEXT NOT NULL DEFAULT '[]',
  "afterPhotos" TEXT NOT NULL DEFAULT '[]',
  "repairMinutes" INTEGER,
  "cost" INTEGER,
  "customerInitial" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT 1,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "CaseStudy_slug_idx" ON "CaseStudy"("slug");
CREATE INDEX "CaseStudy_brand_idx" ON "CaseStudy"("brand");
CREATE INDEX "CaseStudy_publishedAt_idx" ON "CaseStudy"("publishedAt");
