import { AdLoader } from '@/components/ads/ad-loader';
import { SiteChrome } from '@/components/layouts/site-chrome';
import { adsEnabled } from '@/lib/ads-env';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdLoader />
      <SiteChrome cmpAvailable={adsEnabled()}>{children}</SiteChrome>
    </>
  );
}
