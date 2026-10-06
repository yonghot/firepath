import { AdLoader } from '@/components/ads/ad-loader';
import { SiteChrome } from '@/components/layouts/site-chrome';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdLoader />
      <SiteChrome>{children}</SiteChrome>
    </>
  );
}
