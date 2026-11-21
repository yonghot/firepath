import { GUIDE_PAGES } from '@/lib/content-pages';

export type AdEligibilityRules = { staticPaths: string[]; guidePaths: string[] };

export const AD_STATIC_PATHS = [
  '/',
  '/about',
  '/fire-guide',
  '/fire-statistics',
  '/fire-types',
  '/guide',
  '/healthcare-bridge',
  '/methodology',
  '/privacy',
  '/terms',
];

export function buildAdEligibilityRules(): AdEligibilityRules {
  return {
    staticPaths: AD_STATIC_PATHS,
    guidePaths: GUIDE_PAGES.map((page) => page.canonicalPath),
  };
}

export function isAdEligiblePath(pathname: string, rules: AdEligibilityRules): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return rules.staticPaths.includes(path) || rules.guidePaths.includes(path);
}
