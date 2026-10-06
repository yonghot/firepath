import { SiteChrome } from '@/components/layouts/site-chrome';

export default function UtilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
