// 自動文章的配圖挑選 — 保證每篇圖片不重複
//
// 舊做法：把主題對到 10 張本地圖，用 slug hash 取模。圖池只有 11 張、文章 285 篇，
// 結果單張圖被用了 74 次，列表頁一眼看過去全是同一張廚師照。
//
// 新做法：向 Pexels 要一批候選圖，扣掉資料庫已用過的，才回傳。
// 存遠端 URL 不下載檔案（images.pexels.com 已在 next.config remotePatterns 與 CSP 白名單），
// 這樣圖源等同無限，也不會把 repo 撐大。
// Pexels 無法使用時退回本地圖池，並仍盡量避開已用過的。
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// 主題 → Pexels 英文搜尋詞（圖文一致，避免 iPhone 文章配吸塵器圖）
// 每個主題給多組同義查詢：同主題文章很多（例如 128 篇回收行情），
// 只用單一查詢會讓它們全部落在同一批搜尋結果裡，選出來的圖高度相似。
const TOPIC_QUERIES: Array<{ keywords: RegExp; queries: string[] }> = [
  { keywords: /電池|膨脹|續航|健康度|過熱|發燙|降頻/i,
    queries: ["smartphone battery repair", "phone battery replacement", "lithium battery technology", "charging smartphone cable"] },
  { keywords: /綠屏|綠線|花屏|觸控失靈|顯示異常/i,
    queries: ["broken smartphone screen", "damaged phone display", "glitch screen device", "smartphone diagnostics"] },
  { keywords: /macbook|筆電|筆記型電腦/i,
    queries: ["macbook laptop repair", "laptop motherboard technician", "open laptop workspace", "notebook computer desk"] },
  { keywords: /ipad|平板/i,
    queries: ["tablet device repair", "digital tablet desk", "tablet screen hands", "ipad workspace"] },
  { keywords: /switch|遊戲主機|joy.?con|nintendo/i,
    queries: ["game console controller", "handheld gaming device", "video game setup", "gamepad closeup"] },
  { keywords: /dyson|吸塵器|吹風機/i,
    queries: ["vacuum cleaner appliance", "home cleaning device", "hair dryer appliance", "household electronics"] },
  { keywords: /回收|收購|二手|trade.?in/i,
    queries: ["used smartphones collection", "second hand electronics", "electronics recycling", "old mobile phones", "smartphone trade market", "refurbished devices"] },
  { keywords: /板橋|江子翠|門市|實體店/i,
    queries: ["phone repair shop counter", "electronics store interior", "small business storefront", "service counter customer"] },
  { keywords: /主機板|機板|焊接|資料救援|拆機|零件/i,
    queries: ["circuit board soldering", "microelectronics repair", "electronic components closeup", "technician microscope work"] },
  { keywords: /螢幕|玻璃|破裂|碎裂|液晶/i,
    queries: ["cracked phone screen", "shattered glass display", "broken device closeup", "phone screen replacement"] },
  { keywords: /samsung|三星/i,
    queries: ["samsung android phone", "android smartphone closeup", "modern smartphone design", "mobile device flatlay"] },
  { keywords: /iphone|蘋果/i,
    queries: ["iphone repair technician", "apple device closeup", "smartphone disassembly", "mobile phone repair tools"] },
];
const DEFAULT_QUERIES = [
  "mobile phone repair technician", "electronics repair workshop",
  "smartphone technology closeup", "device repair tools",
];

// 字串 → 穩定的 hash，用來決定查詢變體與取圖位置（同一篇每次都拿到同一張）
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pexels 不可用時的本地備援
const LOCAL_COVERS = [
  "/cases/iphone-disassembly.jpg", "/cases/iphone-battery.jpg", "/cases/iphone-broken-screen.jpg",
  "/cases/screen-replacement.jpg", "/cases/soldering.jpg", "/cases/phone-repair-bench.jpg",
  "/cases/tech-shop.jpg", "/cases/macbook-repair.jpg", "/cases/ipad-repair.jpg",
  "/cases/switch-controller.jpg", "/cases/dyson-vacuum.jpg", "/cases/samsung-phone.jpg",
  "/cases/iphone-cracked.jpg", "/cases/phone-banpu.jpg",
];

// 依主題挑查詢變體：同主題的不同文章會拿到不同查詢詞，避免整批圖長得一樣
function pickQueries(contextStrings: string[]): string[] {
  const haystack = contextStrings.join(" ").toLowerCase();
  const seed = hashString(contextStrings.join("|"));
  const matched = TOPIC_QUERIES.find(t => t.keywords.test(haystack));
  const pool = matched ? matched.queries : DEFAULT_QUERIES;
  // 從 hash 決定的位置開始輪，讓不同文章起點不同
  const start = seed % pool.length;
  const ordered = [...pool.slice(start), ...pool.slice(0, start)];
  // 主題查詢用完還不夠時，再退到通用查詢
  return matched ? [...ordered, ...DEFAULT_QUERIES] : ordered;
}

async function loadUsedCovers(): Promise<Set<string>> {
  const rows = await prisma.autoArticle
    .findMany({ select: { coverImage: true } })
    .catch(() => [] as Array<{ coverImage: string | null }>);
  return new Set(rows.map(r => r.coverImage).filter((c): c is string => !!c));
}

interface PexelsPhoto { src?: { large?: string; large2x?: string } }

// 向 Pexels 取一頁結果。per_page 開大一點，才有足夠候選可以扣掉已用過的。
async function searchPexels(query: string, page: number): Promise<string[]> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=80&page=${page}&orientation=landscape`,
      { headers: { Authorization: key }, cache: "no-store" },
    );
    if (!res.ok) {
      console.warn(`[article-cover] Pexels ${res.status} for "${query}"`);
      return [];
    }
    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    return (data.photos || [])
      .map(p => p.src?.large2x || p.src?.large)
      .filter((u): u is string => !!u);
  } catch (e) {
    console.warn("[article-cover] Pexels 取圖失敗", e);
    return [];
  }
}

// 以「圖片內容」判斷是否重複 —— 只比網址會漏掉「同一張照片存成不同檔名／不同 ID」的情況。
// 實測本機 31 個圖檔只有 24 種內容，其中一張被 5 個檔名共用，列表頁看起來就是同一張。
const contentHashCache = new Map<string, string>();

export async function hashCoverContent(cover: string): Promise<string | null> {
  const cached = contentHashCache.get(cover);
  if (cached) return cached;
  try {
    let buf: Buffer;
    if (cover.startsWith("http")) {
      const res = await fetch(cover);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      buf = readFileSync(resolve(process.cwd(), "public", cover.replace(/^\//, "")));
    }
    const h = createHash("sha256").update(buf).digest("hex").slice(0, 16);
    contentHashCache.set(cover, h);
    return h;
  } catch {
    return null;
  }
}

// Pexels 搜尋結果中相鄰的照片常來自同一組拍攝（連號 ID），
// 依序取會拿到「URL 不同但看起來一樣」的圖。改用大跨距掃描把選取打散。
function spreadPick(candidates: string[], seed: number, used: Set<string>): string | null {
  if (candidates.length === 0) return null;
  const n = candidates.length;
  // 與 n 互質的跨距，才能走遍整個清單而不重複
  const stride = 7;
  const start = seed % n;
  for (let i = 0; i < n; i++) {
    const idx = (start + i * stride) % n;
    const url = candidates[idx];
    if (!used.has(url)) return url;
  }
  return null;
}

/**
 * 取一張「全站沒用過」的封面圖。
 * 網址不重複只是第一道；還會下載內容算 SHA-256 比對，
 * 擋掉「同一張照片以不同網址／檔名出現」的情況（這正是先前列表頁看起來全是同一張的原因）。
 * @param usedCovers  已用過的圖（呼叫端可傳入以在同一批生成中共用並累加，避免同批撞圖）
 * @param usedHashes  已用過的內容 hash；不傳則只做網址層級的去重
 */
export async function pickUniqueCover(
  contextStrings: string[],
  usedCovers?: Set<string>,
  usedHashes?: Set<string>,
): Promise<string> {
  const used = usedCovers ?? (await loadUsedCovers());
  const queries = pickQueries(contextStrings);
  const seed = hashString(contextStrings.join("|"));

  for (const query of queries) {
    for (let page = 1; page <= 3; page++) {
      const candidates = await searchPexels(query, page);
      if (candidates.length === 0) break;   // 沒 API key 或查無結果，換下一組查詢
      // 同一頁可能要試幾張才找到內容也沒撞的
      for (let tries = 0; tries < 5; tries++) {
        const fresh = spreadPick(candidates, seed + page + tries * 13, used);
        if (!fresh) break;
        used.add(fresh);                    // 先佔位，避免同批其他文章重試到同一張
        if (!usedHashes) return fresh;      // 呼叫端不要求內容去重
        const h = await hashCoverContent(fresh);
        if (!h) return fresh;               // 抓不到內容就不擋，至少網址是新的
        if (!usedHashes.has(h)) { usedHashes.add(h); return fresh; }
      }
    }
  }

  // 最後退回本地圖池，一樣優先挑沒用過的
  const localFresh = LOCAL_COVERS.find(c => !used.has(c));
  const chosen = localFresh ?? LOCAL_COVERS[used.size % LOCAL_COVERS.length];
  used.add(chosen);
  return chosen;
}

/** 載入全站已用封面的內容 hash（供生成時做內容層級去重） */
export async function loadUsedCoverHashes(): Promise<Set<string>> {
  const covers = await loadUsedCovers();
  const hashes = new Set<string>();
  for (const c of covers) {
    const h = await hashCoverContent(c);
    if (h) hashes.add(h);
  }
  return hashes;
}

export { loadUsedCovers, LOCAL_COVERS };
