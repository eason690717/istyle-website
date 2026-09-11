// 回收價解析器回歸測試 —— 驗證的是「意圖」而非表面行為：
// 容量要取對、機型名稱不能被吃掉、同一支手機在不同來源必須產生相同 modelKey（才能合併比價）。
// 用法：npx tsx scripts/test-recycle-parsers.ts（失敗時 exit 1）
import { parseGenericModel, parseIphone, parseIpad, parseUs3cAndroid } from "../src/lib/recycle/normalizer";
import { normalizeStorage, normalizeRecycleRow } from "../src/lib/normalize-model";
const key = (r: any) => r ? normalizeRecycleRow({ brand: r.brand, modelName: r.modelName, storage: r.storage, variant: r.variant }).modelKey : "NULL";
let fail = 0;
const check = (label: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(42)} got=${JSON.stringify(got)}${ok ? "" : "  want=" + JSON.stringify(want)}`);
};
// 容量：取最大合法值
check("storage: iPad Wi-Fi+5G 256G", normalizeStorage("iPad Air 11 M3 Wi-Fi+5G 256G"), "256GB");
check("storage: Fold7 5G 16G 1TB (RAM vs storage)", normalizeStorage("Galaxy Z Fold7 5G 16G 1TB"), "1TB");
check("storage: S26 Ultra 5G 12G/512G", normalizeStorage("Galaxy S26 Ultra 5G 12G/512G"), "512GB");
check("storage: 小米 15T (model code, no cap)", normalizeStorage("小米 15T"), null);
check("storage: 1024GB -> 1TB", normalizeStorage("1024GB"), "1TB");
// 機型名稱不被吃掉
check("name: 小米 15T Pro 256G", parseGenericModel("小米 15T Pro 256G", "Xiaomi")?.modelName, "小米 15T Pro");
check("name: realme GT Neo 3T 256G", parseGenericModel("realme GT Neo 3T 256G", "realme")?.modelName, "realme GT Neo 3T");
check("name: SAMSUNG S26 Ultra 512G", parseGenericModel("SAMSUNG S26 Ultra 512G", "Samsung")?.modelName, "SAMSUNG S26 Ultra");
// 跨來源 key 必須一致（這才能合併比價）
check("merge: iPhone jyes vs us3c", key(parseIphone("Apple iPhone 17 Pro Max 256G")), key(parseIphone("iPhone 17 Pro Max 256G")));
check("merge: iPad jyes Wi-Fi vs us3c WiFi", key(parseIpad("Apple iPad Air 13 M4 Wi-Fi 128G")), key(parseIpad("iPad Air 13 M4 128G WiFi")));
check("iPad cellular keeps storage", parseIpad("Apple iPad Air 11 M3 Wi-Fi+5G 256G")?.storage, "256GB");
check("iPad cellular variant", parseIpad("Apple iPad Air 11 M3 Wi-Fi+5G 256G")?.variant, "WiFi+5G");
// us3c Android：名稱切割與容量
check("android: S26 Ultra name", parseUs3cAndroid("Samsung Galaxy S26 Ultra 5G 12G/512G SM-S9480")?.modelName, "S26 Ultra");
check("android: S26 Ultra storage", parseUs3cAndroid("Samsung Galaxy S26 Ultra 5G 12G/512G SM-S9480")?.storage, "512GB");
check("android: Fold7 16G 1TB storage", parseUs3cAndroid("Samsung Galaxy Z Fold7 5G 16G 1TB SM-F9660")?.storage, "1TB");
check("android: Pixel Fold name", parseUs3cAndroid("Google Pixel 10 Pro Fold 5G 16G/1TB")?.modelName, "Pixel 10 Pro Fold");
check("android: 小米 15T Pro keeps 15T", parseUs3cAndroid("Xiaomi 小米 15T Pro 12G/1T")?.modelName, "小米 15T Pro");
// us3c ↔ jyes 必須合併（非 Apple 品牌才有兩個來源可比價）
check("merge: Samsung us3c vs jyes", key(parseUs3cAndroid("Samsung Galaxy S26 Ultra 5G 12G/512G SM-S9480")), key(parseGenericModel("SAMSUNG S26 Ultra 512G", "Samsung")));
check("merge: Google us3c vs jyes", key(parseUs3cAndroid("Google Pixel 10 Pro 5G 16G/256G")), key(parseGenericModel("Google Pixel 10 Pro 256G", "Google")));
check("merge: Xiaomi us3c vs jyes", key(parseUs3cAndroid("Xiaomi 小米 15T Pro 12G/512G")), key(parseGenericModel("小米 15T Pro 512G", "Xiaomi")));
console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILED"}`);
process.exit(fail ? 1 : 0);
