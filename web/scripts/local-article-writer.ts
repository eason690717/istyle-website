// 本機知識文章產生器：題目來自網路上的真實搜尋需求，內文由本地 LLM 依網路資料改寫
//
// 老闆指示（2026-10-21）：「題目應該去網路上搜索產生，不是你自己生成…結合本地 LLM」
//
// 流程：
//   1. 從種子關鍵字隨機組合（裝置 × 症狀），例如「iPhone 充電」
//   2. 查 Google 搜尋建議 → 拿到大家實際在搜的問題，例如「iphone 充電充不進去」
//   3. 濾掉價格、購物、論壇、在地店家類的題目；跟既有文章太像的題目也跳過
//   4. DuckDuckGo 搜尋該問題 → 抓前幾篇網頁正文（濾掉廣告與同行網站）
//   5. 本地 LLM（Strata，OpenAI 相容 API）依這些資料用自己的話寫一篇繁體中文文章
//   6. 檢查：繁體化、不得含金額、不得含同行或來源網站名稱、不得與來源有長段相同文字
//   7. 經 createUniqueArticle 寫入（標題與內文指紋唯一，資料庫兜底）
//
// 本地模型只在這台電腦上，所以這支程式由 Windows 工作排程器執行；電腦沒開時暫停，
// 機型故障文章與回收週報仍由 Vercel cron 照常產生，每週篇數不受影響。
//
// 用法：npx tsx scripts/local-article-writer.ts            寫 1 篇並發布
//      npx tsx scripts/local-article-writer.ts --dry      只產生、不寫入資料庫
//      npx tsx scripts/local-article-writer.ts --count 2  寫 2 篇
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import * as OpenCC from "opencc-js";
import { prisma } from "../src/lib/prisma";
import { SITE } from "../src/lib/site-config";
import { createUniqueArticle } from "../src/lib/article-uniqueness";
import { pickUniqueCover, loadUsedCovers } from "../src/lib/article-cover";

const DRY = process.argv.includes("--dry");
const COUNT = Number(process.argv[process.argv.indexOf("--count") + 1]) || 1;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function llmBaseUrl(): string {
  if (process.env.LOCAL_LLM_URL) return process.env.LOCAL_LLM_URL.trim();
  const cfg = resolve(process.cwd(), "..", "review-bot", "config.json");
  if (existsSync(cfg)) {
    try { return JSON.parse(readFileSync(cfg, "utf-8")).llm_base_url; } catch { /* 用預設 */ }
  }
  return "http://127.0.0.1:8080/v1";
}
const LLM = llmBaseUrl();

// ── 1. 種子關鍵字（只決定「往哪個方向找」，題目本身一律來自真實搜尋建議）────────
const DEVICES = ["iPhone", "iPad", "MacBook", "三星手機", "安卓手機", "Pixel", "Switch", "AirPods", "手機", "平板", "Apple Watch"];
const SYMPTOMS = ["電池", "充電", "螢幕", "進水", "發燙", "當機", "鏡頭", "喇叭", "沒聲音", "訊號", "儲存空間", "Face ID",
  "指紋", "藍牙", "WiFi", "自動關機", "黑屏", "閃退", "耗電", "觸控", "備份", "更新", "按鍵", "麥克風"];

// 我們不寫的題目：價格（站內規定文章不放價格）、購物、論壇轉述、在地店家
const REJECT_TOPIC = /費用|價格|價錢|多少錢|便宜|ptt|dcard|mobile01|推薦|哪裡|台北|台中|台南|高雄|新北|板橋|門市|專賣|官網|購買|優惠|折扣|二手價|回收價|評價|開箱|比較|vs|規格|發表|上市|顏色|尺寸/i;
// 要的題目：真正的「問題」或「怎麼做」
const WANT_TOPIC = /怎麼|為什麼|原因|無法|不能|不行|沒反應|充不|開不|很慢|變慢|失靈|壞|故障|異常|問題|發燙|進水|關機|黑屏|閃退|耗電|斷線|沒聲音|不見|消失|跳出|卡住|設定|教學|備份|清理|解決/;

// 不讓同行或來源網站的名稱出現在文章裡
const COMPETITOR = /cerphone|us3c|jyes|second3c|wsphone|手機急診室|nawies|dra-3c|0526|mrmad|傑昇|地標|通訊行/i;

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function fetchText(url: string, ms = 12000): Promise<string> {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9" }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  const enc = /big5/i.test(ct) ? "big5" : "utf-8";
  return new TextDecoder(enc).decode(buf);
}

async function suggest(q: string): Promise<string[]> {
  const raw = await fetchText(`https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-TW&gl=tw&q=${encodeURIComponent(q)}`);
  try { return (JSON.parse(raw)[1] as string[]) || []; } catch { return []; }
}

// 字元雙字組相似度：擋下「iphone 充電很慢」與「iphone 充電變慢」這種換句話說的重複題目
function bigrams(s: string): Set<string> {
  const t = s.toLowerCase().replace(/[\s\p{P}]/gu, "");
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}
function similarity(a: string, b: string): number {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

async function pickTopic(existing: string[], tried: Set<string>): Promise<string | null> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = `${rnd(DEVICES)} ${rnd(SYMPTOMS)}`;
    const list = (await suggest(seed).catch(() => [])).filter(s =>
      !tried.has(s) && s.trim() !== seed.toLowerCase() && !REJECT_TOPIC.test(s) && WANT_TOPIC.test(s) && s.length >= 6);
    for (const s of list) {
      tried.add(s);
      const near = existing.find(e => similarity(e, s) >= 0.45);
      if (near) { console.log(`   略過「${s}」：與既有「${near}」太接近`); continue; }
      console.log(`   種子「${seed}」→ 搜尋建議選中「${s}」`);
      return s;
    }
  }
  return null;
}

// ── 2. 搜尋並抓取資料 ─────────────────────────────────────────────────────
async function searchSources(query: string): Promise<Array<{ url: string; title: string; text: string }>> {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=tw-tzh`);
  const $ = cheerio.load(html);
  const links: Array<{ url: string; title: string }> = [];
  const seenHost = new Set<string>();
  $("a.result__a").each((_, a) => {
    let href = $(a).attr("href") || "";
    const m = href.match(/uddg=([^&]+)/); if (m) href = decodeURIComponent(m[1]);
    if (!/^https?:/.test(href) || /duckduckgo\.com\/y\.js|ad_domain=/.test(href)) return;   // 廣告
    let host = ""; try { host = new URL(href).hostname; } catch { return; }
    if (seenHost.has(host) || /i-style\.store|youtube\.com|facebook\.com|ptt\.cc|dcard\.tw/.test(host)) return;
    seenHost.add(host);
    links.push({ url: href, title: $(a).text().trim() });
  });
  const out: Array<{ url: string; title: string; text: string }> = [];
  for (const l of links.slice(0, 6)) {
    if (out.length >= 4) break;
    try {
      const $$ = cheerio.load(await fetchText(l.url));
      $$("script,style,nav,header,footer,aside,form,noscript,iframe").remove();
      const main = $$("article").first().text() || $$("main").first().text() || $$("body").text();
      const text = main.replace(/\s+/g, " ").trim().slice(0, 3500);
      if (text.length > 400) out.push({ ...l, text });
    } catch (e) { console.log(`   抓取失敗 ${l.url.slice(0, 60)}：${String(e).slice(0, 60)}`); }
  }
  return out;
}

// ── 3. 本地 LLM 撰寫 ──────────────────────────────────────────────────────
async function llmWrite(topic: string, sources: Array<{ text: string }>, stricter: boolean): Promise<string> {
  const material = sources.map((s, i) => `【資料 ${i + 1}】\n${s.text}`).join("\n\n");
  const system = `你是台灣手機維修店「i時代」的技術編輯，用繁體中文（台灣用語）寫衛教文章。
規則：
- 只根據提供的資料整理，資料沒提到的不要編造
- 必須用自己的話重新組織與改寫，不可以照抄資料中的句子${stricter ? "；任何超過 15 個字的連續句子都不可以和資料相同" : ""}
- 不可以出現任何金額、價格、費用數字
- 不可以提到任何網站、店家、品牌商店或作者名稱
- 不要寫結尾的廣告或聯絡方式`;
  const user = `讀者在網路上搜尋：「${topic}」

請依下面資料寫一篇 700～1100 字的文章回答這個問題。
輸出格式（嚴格遵守）：
第一行：標題：<20～32 字、能回答搜尋問題的標題>
第二行：摘要：<40～70 字>
第三行起：文章內文，用 Markdown，包含 3～5 個 ## 小標題，可用條列

${material}`;
  const res = await fetch(`${LLM}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: 4500, temperature: stricter ? 0.8 : 0.5,
    }),
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!res.ok) throw new Error(`本地模型 HTTP ${res.status}`);
  const d = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return (d.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

const toTW = OpenCC.Converter({ from: "cn", to: "tw" });

function parseDraft(raw: string) {
  const text = toTW(raw);
  const title = text.match(/^\s*標題[：:]\s*(.+)$/m)?.[1]?.trim().replace(/^[「"]|[」"]$/g, "");
  const excerpt = text.match(/^\s*摘要[：:]\s*(.+)$/m)?.[1]?.trim();
  const bodyStart = text.search(/^##\s/m);
  const body = bodyStart >= 0 ? text.slice(bodyStart).trim() : "";
  return { title, excerpt, body };
}

// 與來源有 ≥ 25 個連續字相同就視為抄寫（標點空白不算）
function copiedFrom(body: string, sources: Array<{ text: string }>): string | null {
  const clean = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, "");
  const b = clean(body);
  const src = sources.map(s => clean(toTW(s.text)));
  for (let i = 0; i + 25 <= b.length; i += 5) {
    const piece = b.slice(i, i + 25);
    if (src.some(s => s.includes(piece))) return piece;
  }
  return null;
}

function validate(d: ReturnType<typeof parseDraft>, sources: Array<{ text: string }>): string | null {
  if (!d.title || d.title.length < 8) return "缺標題";
  if (!d.excerpt) return "缺摘要";
  if (d.body.length < 500) return `內文太短（${d.body.length} 字）`;
  // 輸出上限不夠時模型會在句子中間被截斷，這種半篇文章絕不能發出去
  if (!/[。！？）」]$/.test(d.body.replace(/[s*_#-]+$/, ""))) return "內文在句子中間被截斷";
  if (/\$\s?\d|NT\s?\$|\d[\d,]*\s*元|費用約|價格約/.test(d.title + d.body)) return "含金額";
  if (COMPETITOR.test(d.title + d.body)) return "含同行或來源網站名稱";
  if (/https?:\/\/|www\./.test(d.body)) return "含網址";
  const copied = copiedFrom(d.body, sources);
  if (copied) return `與來源文字雷同（${copied.slice(0, 12)}…）`;
  return null;
}

function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

async function main() {
  const alive = await fetch(`${LLM}/models`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false);
  if (!alive) {
    console.error(`❌ 本地模型沒有在跑（${LLM}）。請先啟動 Strata（review-bot 的 /model iq2 或 iq4），再重跑。`);
    process.exit(1);
  }
  const existing = (await prisma.autoArticle.findMany({ select: { title: true, subject: true } }))
    .flatMap(a => [a.title, a.subject].filter((x): x is string => !!x));
  const usedCovers = await loadUsedCovers();
  const batchHashes = new Set<string>();
  const tried = new Set<string>();
  let published = 0;

  for (let n = 0; n < COUNT; n++) {
    console.log(`\n=== 第 ${n + 1} 篇 ===`);
    let done = false;
    for (let topicTry = 0; topicTry < 4 && !done; topicTry++) {
      const topic = await pickTopic(existing, tried);
      if (!topic) { console.log("   找不到合適的新題目"); break; }
      const sources = await searchSources(topic);
      console.log(`   取得 ${sources.length} 篇參考資料`);
      if (sources.length < 2) { console.log("   資料不足，換題目"); continue; }

      let draft: ReturnType<typeof parseDraft> | null = null;
      for (let w = 0; w < 2; w++) {
        const t0 = Date.now();
        const d = parseDraft(await llmWrite(topic, sources, w > 0));
        const bad = validate(d, sources);
        console.log(`   撰寫 ${Math.round((Date.now() - t0) / 1000)}s → ${bad ? "不合格：" + bad : "通過檢查"}`);
        if (!bad) { draft = d; break; }
      }
      if (!draft) { console.log("   兩次都不合格，換題目"); continue; }

      const slug = `kb-${fnv(topic)}`;
      const body = `${draft.body}

## 需要專業協助？

自己判斷不出問題，可以先用[免費自助診斷](/diagnose)，或把狀況與照片傳 LINE 給我們。
各維修項目費用請見[維修報價](/quote)，站上每日更新。

- **LINE 預約折 $100**：[加入 ${SITE.lineId}](${SITE.lineAddUrl})
- **來電**：${SITE.phone}
`;
      if (DRY) {
        console.log(`\n[DRY] slug=${slug}\n標題：${draft.title}\n摘要：${draft.excerpt}\n\n${body}`);
        done = true; break;
      }
      const r = await createUniqueArticle({
        slug, kind: "knowledge", subject: topic, title: draft.title!, excerpt: draft.excerpt!, body,
        coverImage: await pickUniqueCover([slug, draft.title!, topic], usedCovers, batchHashes),
        metaDescription: draft.excerpt!.slice(0, 150),
        keywords: [topic, ...draft.title!.split(/[？?｜|，、：:\s]+/).filter(w => w.length >= 2).slice(0, 5)].join(","),
      });
      if (r.ok) {
        published++; done = true;
        existing.push(draft.title!, topic);
        console.log(`   ✅ 已發布 ${SITE.url}/blog/auto/${slug}\n      ${draft.title}`);
      } else console.log(`   未發布：${r.reason}`);
    }
  }
  console.log(`\n完成：發布 ${published} / 目標 ${COUNT}${DRY ? "（DRY 模式不寫入）" : ""}`);
  process.exit(!DRY && published < COUNT ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
