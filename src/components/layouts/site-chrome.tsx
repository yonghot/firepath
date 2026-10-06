import type { ReactNode } from 'react';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export function SiteChrome({ children }: { children: ReactNode }) {
  const premiumAvailable = isPremiumPurchasable();
  const authAvailable = isSupabaseConfigured();
  return (
    <>
      <Header premiumAvailable={premiumAvailable} authAvailable={authAvailable} />
      <main className="flex-1">{children}</main>
      <Footer premiumAvailable={premiumAvailable} />
      <FeedbackWidget />
    </>
  );
}
