import type { ReactNode } from 'react';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export function SiteChrome({ children, cmpAvailable = false }: { children: ReactNode; cmpAvailable?: boolean }) {
  const premiumAvailable = isPremiumPurchasable();
  const authAvailable = isSupabaseConfigured();
  return (
    <>
      <Header premiumAvailable={premiumAvailable} authAvailable={authAvailable} />
      <main className="flex-1">{children}</main>
      <Footer premiumAvailable={premiumAvailable} cmpAvailable={cmpAvailable} />
    </>
  );
}
