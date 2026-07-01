import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createSubscriptionService } from '@/lib/utils/api-handler';

/**
 * Stripe webhook handler.
 *
 * Security: authenticated by the Stripe signature (STRIPE_WEBHOOK_SECRET), NOT
 * by a user session. We read the RAW request body for signature verification,
 * then reconcile subscription state into Supabase with a SERVICE-ROLE client
 * (RLS bypassed) — see createServiceClient().
 *
 * ENV-GUARDED: if Stripe or Supabase is unconfigured (the free build), the
 * route returns 503 without throwing, so `next build` succeeds and the free
 * site keeps working. Stripe simply won't be sending events in that scenario.
 *
 * Webhook secret is REQUIRED to verify signatures — we never trust an unsigned
 * payload.
 */

// Stripe needs the raw, unparsed body — force the Node.js runtime and dynamic.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  // Feature disabled when keys/backend are absent — degrade, don't crash.
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { success: false, error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe webhook disabled' } },
      { status: 503 }
    );
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Backend not configured' } },
      { status: 503 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { success: false, error: { code: 'SIGNATURE_MISSING', message: 'Missing stripe-signature header' } },
      { status: 400 }
    );
  }

  // Verify signature against the RAW body.
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Stripe webhook signature verification failed:', message);
    return NextResponse.json(
      { success: false, error: { code: 'SIGNATURE_INVALID', message } },
      { status: 400 }
    );
  }

  try {
    // Service-role client: the webhook has no user session, so it bypasses RLS
    // to write the subscription/profile rows it owns.
    const supabase = await createServiceClient();
    const service = createSubscriptionService(supabase);

    switch (event.type) {
      case 'checkout.session.completed':
        await service.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await service.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      default:
        // Ignore unrelated events; acknowledge so Stripe stops retrying.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Return 500 so Stripe retries transient failures, but don't leak details.
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    return NextResponse.json(
      { success: false, error: { code: 'WEBHOOK_HANDLER_ERROR', message: 'Failed to process event' } },
      { status: 500 }
    );
  }
}
