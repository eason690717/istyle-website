import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";
import { SERVICES } from "@/lib/services-catalog";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { LOCAL_AREAS } from "@/lib/local-areas";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/quote`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE.url}/recycle`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/booking`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/diagnose`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/cases`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/upgrade-tool`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE.url}/local`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/repair/lookup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...LOCAL_AREAS.map(a => ({
      url: `${SITE.url}/local/${a.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...SERVICES.map(s => ({
      url: `${SITE.url}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...BLOG_POSTS.map(p => ({
      url: `${SITE.url}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  // 動態：所有品牌 + 所有機型 + 所有自動文章
  try {
    const [brands, models, autoArticles, caseStudies] = await Promise.all([
      prisma.brand.findMany({ where: { isActive: true } }),
      prisma.deviceModel.findMany({
        where: { isActive: true },
        include: { brand: { select: { slug: true } } },
      }),
      prisma.autoArticle.findMany({ orderBy: { publishedAt: "desc" }, take: 60 }),
      prisma.caseStudy.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 100 }),
    ]);

    return [
      ...base,
      ...brands.map(b => ({
        url: `${SITE.url}/quote/${b.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      })),
      ...models.map(m => ({
        url: `${SITE.url}/quote/${m.brand.slug}/${m.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...autoArticles.map(a => ({
        url: `${SITE.url}/blog/auto/${a.slug}`,
        lastModified: a.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...caseStudies.map(c => ({
        url: `${SITE.url}/cases/${c.slug}`,
        lastModified: c.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return base;
  }
}
