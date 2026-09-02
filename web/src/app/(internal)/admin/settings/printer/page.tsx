import Link from "next/link";

export const metadata = { title: "收據印表機設定", robots: { index: false, follow: false } };

export default function PrinterSetupPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/settings" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回設定</Link>
        <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">🖨 收據印表機設定</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">系統收據用 80mm 熱感紙設計，搭配下面任一台印表機都能直接列印</p>
      </div>

      <section className="rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-5">
        <h2 className="font-serif text-lg text-[var(--gold)]">✅ 推薦做法（最簡單）</h2>
        <p className="mt-2 text-sm">
          熱感印表機接到電腦／平板的 USB / Wi-Fi / 藍牙，<br />
          設成 OS 預設印表機，POS 收據頁按「🖨 列印」就會送過去。<br />
          <strong className="text-[var(--gold-bright)]">不需要安裝任何特殊軟體。</strong>
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg text-[var(--gold)]">推薦印表機（雙北現貨好買）</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PrinterCard
            name="SUNMI V2 Pro"
            badge="🏆 推薦首選"
            badgeColor="bg-[var(--gold)] text-black"
            price="NT$ 8,000~10,000"
            specs={[
              "Android 平板 + 80mm 熱感印表機 一體機",
              "5.5 吋觸控螢幕，內建 Chrome 開 i時代 POS",
              "外接金屬支架直接擺收銀台",
              "Wi-Fi / 4G / Bluetooth 都有",
              "有相機可掃條碼",
            ]}
            link="https://www.sunmi.com/zh-Hant/v2-pro/"
            why="買一台機器把『POS 平板 + 印表機』全部解決，最少配線。"
          />
          <PrinterCard
            name="Epson TM-m30III"
            badge="📌 經典工業款"
            price="NT$ 6,500~8,000"
            specs={[
              "80mm 熱感印表機（不含螢幕，需搭配電腦或平板）",
              "USB / Wi-Fi / Bluetooth / Lightning 全都支援",
              "速度 250mm/s，極快",
              "iPhone iPad 直接 AirPrint 列印",
              "Epson 大廠保固，全台維修點多",
            ]}
            link="https://epson.com.tw/products/printers/tm-m30iii/"
            why="店裡已經有平板／電腦，買這台直接擺旁邊用。"
          />
        </div>

        <h3 className="mt-6 font-serif text-base text-[var(--gold)]">省錢備案</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Mini name="創群 SP-3000" price="~$3,500" note="台灣品牌、USB、最便宜" />
          <Mini name="Star TSP143IIIBI" price="~$5,500" note="藍牙連手機 / iPad" />
          <Mini name="任何 80mm 熱感（蝦皮）" price="~$2,500" note="無品牌但能用，可能驅動麻煩" />
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <h2 className="font-serif text-lg text-[var(--gold)]">設定步驟</h2>
        <ol className="mt-3 space-y-2 text-sm">
          <li>1. 印表機開機，連到收銀台的電腦／平板（USB 或藍牙配對）</li>
          <li>2. Windows / macOS / Android / iPadOS 自動安裝驅動（90% 機種免手動）</li>
          <li>3. 系統「印表機與掃描器」設成<strong>預設</strong></li>
          <li>4. 進 POS 結帳完跳到收據頁，按「🖨 列印收據」</li>
          <li>5. 印表機跳出列印選擇 → 選你的熱感印表機 → 列印</li>
        </ol>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <h2 className="font-serif text-lg text-[var(--gold)]">客戶要紙本發票（不要電子發票）</h2>
        <p className="mt-2 text-sm text-[var(--fg)]">
          系統預設開電子發票（綠界）。如果客戶要紙本：
        </p>
        <ol className="mt-3 space-y-2 text-sm">
          <li>1. 結帳前進「客戶資訊」填統一編號（B2B 必開紙本）</li>
          <li>2. 結帳完，進收據頁的「電子發票」連結 → 至財政部平台查到 PDF → 列印</li>
          <li>3. 或聯絡綠界客服請對方寄送紙本給客人（有手續費）</li>
        </ol>
        <p className="mt-3 rounded bg-[var(--gold)]/10 p-2 text-xs text-[var(--gold-bright)]">
          💡 大多數客人有電子發票就 OK，只有公司行號才會堅持紙本（含統編那種）
        </p>
      </section>
    </div>
  );
}

function PrinterCard({ name, badge, badgeColor, price, specs, link, why }: {
  name: string; badge: string; badgeColor?: string; price: string; specs: string[]; link: string; why: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-5 hover:border-[var(--gold)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-serif text-lg text-[var(--gold)]">{name}</div>
          <div className="mt-0.5 text-sm text-[var(--gold-bright)]">{price}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${badgeColor || "bg-[var(--border)] text-[var(--fg-muted)]"}`}>{badge}</span>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-[var(--fg)]">
        {specs.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-[var(--gold)]">•</span>{s}</li>)}
      </ul>
      <p className="mt-3 rounded bg-black/30 p-2 text-[10px] text-[var(--fg-muted)]">💡 {why}</p>
      <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs text-[var(--gold)] hover:underline">
        看官方規格 →
      </a>
    </div>
  );
}

function Mini({ name, price, note }: { name: string; price: string; note: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-center">
      <div className="text-sm">{name}</div>
      <div className="mt-1 text-xs text-[var(--gold-bright)]">{price}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{note}</div>
    </div>
  );
}
