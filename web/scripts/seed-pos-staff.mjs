// 建立預設店員（老闆 / 店長）給 POS 測試用
import "dotenv/config";
import { createClient } from "@libsql/client";
import crypto from "node:crypto";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const PIN_SALT = (process.env.STAFF_PIN_SALT || "istyle-pos-default").trim();
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }

const db = createClient({ url, authToken });

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin + PIN_SALT).digest("hex");
}

const STAFF = [
  { code: "01", name: "老闆", pin: "9999", role: "MANAGER" },
  { code: "02", name: "店員 A", pin: "1234", role: "CASHIER" },
];

for (const s of STAFF) {
  const existing = await db.execute({
    sql: "SELECT id FROM StaffMember WHERE code = ?",
    args: [s.code],
  });
  if (existing.rows.length > 0) {
    console.log(`Skip: ${s.code} ${s.name} 已存在`);
    continue;
  }
  await db.execute({
    sql: `INSERT INTO StaffMember (code, name, pinHash, role, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [s.code, s.name, hashPin(s.pin), s.role],
  });
  console.log(`Created: ${s.code} ${s.name} (PIN: ${s.pin}, role: ${s.role})`);
}

console.log("\n預設店員建立完成：");
console.log("  代號 01 / PIN 9999  → 老闆 (MANAGER, 可作廢交易)");
console.log("  代號 02 / PIN 1234  → 店員 A (CASHIER)");
console.log("\n⚠️ 上線後請去 /admin/staff 改密碼或刪掉預設帳號");
