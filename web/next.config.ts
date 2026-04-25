import type { NextConfig } from "next";

// 安全 HTTP headers — 全站套用，提升安全性與 SEO trust
const securityHeaders = [
  // 強制 HTTPS（瀏覽器記住 1 年）
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // 阻止點擊劫持
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 禁止瀏覽器猜測 MIME 類型
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 控制 Referer 洩漏
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 限制存取裝置硬體
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  // 限制資源來源（避免 XSS、注入）
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://cdn.store-assets.com https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://va.vercel-scripts.com https://vercel.live wss://ws-us3.pusher.com",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://payment-stage.ecpay.com.tw https://payment.ecpay.com.tw",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // 禁止跨 origin 載入導致資訊洩漏
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // 圖片優化
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.store-assets.com" },
    ],
  },
  // 全站套用安全 headers
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // 後台禁止被搜尋引擎索引
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  // 隱藏 Next.js 版本（降低指紋識別）
  poweredByHeader: false,
  // 嚴格模式
  reactStrictMode: true,
};

export default nextConfig;
