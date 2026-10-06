export const SHARED_PUBLISHER_CLIENT_ID = 'ca-pub-1378312299412437';

export function normaliseAdsenseClientId(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith('ca-')) return value;
  return value.startsWith('pub-') ? `ca-${value}` : `ca-pub-${value}`;
}

// Literal process.env member reads only: Next inlines NEXT_PUBLIC_* into client bundles solely for static access.
export function resolveAdsenseClientId(): string | undefined {
  const configured = normaliseAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
  if (configured) return configured;
  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;
  return vercelEnv === 'production' ? SHARED_PUBLISHER_CLIENT_ID : undefined;
}

export function adsEnabled(): boolean {
  return resolveAdsenseClientId() !== undefined;
}
