// 套用 Apple 螢幕報價邏輯異常的 manualOverride
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const db = createClient({ url, authToken });

// 異常修法：基於「同代 Plus 應比標準版貴」+「舊代不應比新代貴」
// 預設使用「往上微調」策略，避免店家虧本
const overrides = [
  {
    modelName: "iPhone 16 Plus",
    itemName: "螢幕破裂",
    newPrice: 7200,
    reason: "原計算價 $6,100 < iPhone 16 $6,500，違反 Plus > 標準版定價邏輯。手動拉高到 $7,200（介於 16 與 16 Pro 之間）",
  },
  {
    modelName: "iPhone 15 Plus",
    itemName: "螢幕破裂",
    newPrice: 6500,
    reason: "原計算價 $5,900 = iPhone 15 $5,900，未體現 Plus 較大螢幕成本。手動拉到 $6,500",
  },
  {
    modelName: "iPad Pro 12.9 第二代",
    itemName: "螢幕破裂",
    newPrice: 7500,
    reason: "原計算價 $11,200 > 第三代 $7,200，二代為 2017 年機型不應反而比新世代貴。降至接近三代水準 $7,500",
  },
];

for (const o of overrides) {
  const res = await db.execute({
    sql: `UPDATE RepairPrice
          SET manualOverride = ?,
              overrideReason = ?,
              overriddenAt = CURRENT_TIMESTAMP,
              overriddenBy = 'admin@i-style.store'
          WHERE modelId = (SELECT id FROM DeviceModel WHERE name = ?)
            AND itemId = (SELECT id FROM RepairItem WHERE name = ?)
            AND tier = 'STANDARD'`,
    args: [o.newPrice, o.reason, o.modelName, o.itemName],
  });
  console.log(`✓ ${o.modelName} / ${o.itemName} → $${o.newPrice}（${res.rowsAffected} rows）`);
}

console.log("\n完成。檢查 /admin/prices 可看到 override 標記。");
