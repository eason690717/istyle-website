-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT,
    "price" INTEGER NOT NULL,
    "comparePrice" INTEGER,
    "cost" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'i時代',
    "legalName" TEXT NOT NULL DEFAULT '愛時代國際股份有限公司',
    "taxId" TEXT NOT NULL DEFAULT '42648769',
    "phone" TEXT,
    "lineId" TEXT DEFAULT '@563amdnh',
    "email" TEXT DEFAULT 'admin@i-style.store',
    "addressLine" TEXT,
    "city" TEXT NOT NULL DEFAULT '新北市',
    "district" TEXT NOT NULL DEFAULT '板橋區',
    "postalCode" TEXT,
    "googleMapsUrl" TEXT,
    "googlePlaceId" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "businessHours" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "cerphoneMarkupRate" REAL NOT NULL DEFAULT 1.15,
    "oemMarkupRate" REAL NOT NULL DEFAULT 1.5,
    "priceRoundingUnit" INTEGER NOT NULL DEFAULT 100,
    "recycleOfficialMargin" REAL NOT NULL DEFAULT 0.4,
    "recycleCompetitorDiscount" REAL NOT NULL DEFAULT 0.85,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSetting" ("addressLine", "businessHours", "cerphoneMarkupRate", "city", "companyName", "district", "email", "googleMapsUrl", "googlePlaceId", "id", "latitude", "legalName", "lineId", "longitude", "metaDescription", "metaKeywords", "metaTitle", "oemMarkupRate", "phone", "postalCode", "priceRoundingUnit", "recycleCompetitorDiscount", "recycleOfficialMargin", "taxId", "updatedAt") SELECT "addressLine", "businessHours", "cerphoneMarkupRate", "city", "companyName", "district", "email", "googleMapsUrl", "googlePlaceId", "id", "latitude", "legalName", "lineId", "longitude", "metaDescription", "metaKeywords", "metaTitle", "oemMarkupRate", "phone", "postalCode", "priceRoundingUnit", "recycleCompetitorDiscount", "recycleOfficialMargin", "taxId", "updatedAt" FROM "SiteSetting";
DROP TABLE "SiteSetting";
ALTER TABLE "new_SiteSetting" RENAME TO "SiteSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
