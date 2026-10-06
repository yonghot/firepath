export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

const PUBLISHER_EMAIL = 'contact@actigence.ai';

export const PUBLISHER = {
  name: 'Actigence',
  url: 'https://actigence.ai',
  email: PUBLISHER_EMAIL,
  correctionRequest: `To request a correction, email ${PUBLISHER_EMAIL} with the page address and the statement or figure in question.`,
} as const;

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
