import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingCta } from "@/components/floating-cta";
import { PromoBanner } from "@/components/promo-banner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE } from "@/lib/site-config";

const notoSans = Noto_Sans_TC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline} | 板橋手機維修`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.legalName }],
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

// LocalBusiness JSON-LD（GEO 核心 — AI 搜尋容易取用結構化資料）
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE.url}/#business`,
  name: SITE.name,
  legalName: SITE.legalName,
  description: SITE.description,
  url: SITE.url,
  telephone: SITE.phone,
  email: SITE.email,
  image: `${SITE.url}/logo.png`,
  logo: `${SITE.url}/logo.png`,
  foundingDate: `${SITE.founded}-01-01`,
  address: {
    "@type": "PostalAddress",
    addressCountry: "TW",
    addressRegion: SITE.address.city,
    addressLocality: SITE.address.district,
    streetAddress: SITE.address.street,
    postalCode: SITE.address.zipcode,
  },
  openingHoursSpecification: SITE.businessHours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: h.open,
    closes: h.close,
  })),
  areaServed: [
    { "@type": "City", name: "新北市" },
    { "@type": "AdministrativeArea", name: "板橋區" },
  ],
  knowsAbout: ["手機維修", "iPhone維修", "iPad維修", "MacBook維修", "Switch維修", "Dyson維修", "二手機回收"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${notoSans.variable} ${notoSerif.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--fg)] antialiased pb-14 md:pb-0">
        <PromoBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingCta />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
