import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const premiumAvailable = isPremiumPurchasable();
  const authAvailable = isSupabaseConfigured();
  return (
    <>
      <Header premiumAvailable={premiumAvailable} authAvailable={authAvailable} />
      <main className="flex-1">{children}</main>
      <Footer premiumAvailable={premiumAvailable} />
    </>
  );
}
