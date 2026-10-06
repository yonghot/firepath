import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { isPremiumPurchasable } from '@/lib/premium-availability';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const premiumAvailable = isPremiumPurchasable();
  return (
    <>
      <Header premiumAvailable={premiumAvailable} />
      <main className="flex-1">{children}</main>
      <Footer premiumAvailable={premiumAvailable} />
    </>
  );
}
