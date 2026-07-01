'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

interface ApiErrorShape {
  code: string;
  message: string;
}

/**
 * Premium upgrade / manage button.
 *
 * - When Stripe is NOT configured (`enabled=false`), renders a disabled
 *   "Coming Soon" button — preserving the existing free-build behavior.
 * - When the user is already premium, offers a Customer Portal link.
 * - Otherwise, requires auth (redirects to /login) then starts Stripe Checkout.
 */
export function UpgradeButton({
  enabled,
  isPremium,
}: {
  enabled: boolean;
  isPremium: boolean;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // Stripe unconfigured → keep the original "Coming Soon" affordance.
  if (!enabled) {
    return (
      <>
        <Button className="w-full mt-4" disabled>
          <Crown className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Premium subscriptions launching soon.
        </p>
      </>
    );
  }

  async function postJson(url: string): Promise<{ url: string }> {
    const res = await fetch(url, { method: 'POST' });
    const json = (await res.json()) as
      | { success: true; data: { checkoutUrl?: string; portalUrl?: string } }
      | { success: false; error: ApiErrorShape };
    if (!json.success) {
      throw new Error(json.error.message || 'Something went wrong');
    }
    const target = json.data.checkoutUrl ?? json.data.portalUrl;
    if (!target) throw new Error('No redirect URL returned');
    return { url: target };
  }

  const handleManage = async () => {
    setBusy(true);
    try {
      const { url } = await postJson('/api/subscriptions/portal');
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
      setBusy(false);
    }
  };

  const handleUpgrade = async () => {
    // Require auth first.
    if (!user) {
      router.push('/login?redirect=/premium');
      return;
    }
    setBusy(true);
    try {
      const { url } = await postJson('/api/subscriptions');
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
      setBusy(false);
    }
  };

  if (isPremium) {
    return (
      <>
        <Button className="w-full mt-4" variant="outline" onClick={handleManage} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Manage Subscription
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          You&apos;re on Premium. Thank you for supporting FIREPath.
        </p>
      </>
    );
  }

  return (
    <>
      <Button className="w-full mt-4" onClick={handleUpgrade} disabled={busy || loading}>
        {busy ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Crown className="h-4 w-4 mr-2" />
        )}
        Upgrade to Premium
      </Button>
      <p className="text-xs text-muted-foreground text-center mt-2">
        $4.99/month · Cancel anytime.
      </p>
    </>
  );
}
