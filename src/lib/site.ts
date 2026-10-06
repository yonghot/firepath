export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

export function isCanonicalProductionHost(host: string, vercelEnv: string | undefined): boolean {
  if (vercelEnv !== 'production') return false;
  let canonical: string;
  try {
    canonical = new URL(SITE_URL).hostname;
  } catch {
    return false;
  }
  return host === canonical || host === `www.${canonical}`;
}
