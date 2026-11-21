import { SiteChrome } from '@/components/layouts/site-chrome';
import { adsEnabled } from '@/lib/ads-env';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteChrome cmpAvailable={adsEnabled()}>{children}</SiteChrome>
    </>
  );
}
