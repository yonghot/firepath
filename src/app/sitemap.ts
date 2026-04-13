import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://firepath.app';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/premium`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // /result is intentionally excluded — it renders personalized content
    // from a URL hash (shared results), which would duplicate / in search.
  ];

  // Guide slugs — hardcoded since Supabase may not be available at build time
  const guideSlugs = [
    'what-is-coastfire',
    'what-is-leanfire',
    'what-is-regular-fire',
    'what-is-fatfire',
    'lean-vs-fat-fire',
    'coast-vs-barista-fire',
    'what-is-baristafire',
  ];

  const guidePages: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${baseUrl}/guide/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...guidePages];
}
