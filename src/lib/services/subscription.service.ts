import type Stripe from 'stripe';
import { SubscriptionRepository } from '@/lib/repositories/subscription.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { AppError } from '@/constants/error-codes';
import {
  getStripe,
  getPremiumPriceId,
  isStripeConfigured,
  isPremiumPriceConfigured,
} from '@/lib/stripe/server';
import { SITE_URL } from '@/lib/site';

export class SubscriptionService {
  constructor(
    private subRepo: SubscriptionRepository,
    private profileRepo: ProfileRepository
  ) {}

  async getCurrent(userId: string) {
    const profile = await this.profileRepo.findById(userId);
    const subscription = await this.subRepo.findByUser(userId);

    return {
      tier: profile?.subscription_tier || 'free',
      subscription,
    };
  }

  /**
   * Start a Stripe Checkout session (mode: subscription) for the premium price.
   * ENV-GUARDED: throws STRIPE_NOT_CONFIGURED (→ 503) when Stripe keys or the
   * price id are absent; the UI never offers checkout in that state.
   */
  async createCheckout(userId: string, userEmail?: string) {
    const stripe = getStripe();
    const priceId = getPremiumPriceId();
    if (!stripe || !priceId) {
      throw new AppError('STRIPE_NOT_CONFIGURED');
    }

    const existing = await this.subRepo.findByUser(userId);
    if (existing && existing.status === 'active') {
      throw new AppError('SUB_ALREADY_ACTIVE');
    }

    // Reuse an existing Stripe customer if we already have one for this user.
    let customerId: string | undefined = existing?.stripe_customer_id || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Tie the session back to our user for the webhook.
      client_reference_id: userId,
      subscription_data: { metadata: { supabase_user_id: userId } },
      metadata: { supabase_user_id: userId },
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/premium?checkout=cancelled`,
    });

    if (!session.url) {
      throw new AppError('STRIPE_ERROR');
    }
    return { checkoutUrl: session.url };
  }

  /**
   * Open a Stripe Customer Portal session for managing/cancelling the sub.
   * ENV-GUARDED like checkout.
   */
  async createPortal(userId: string) {
    const stripe = getStripe();
    if (!stripe) {
      throw new AppError('STRIPE_NOT_CONFIGURED');
    }

    const subscription = await this.subRepo.findByUser(userId);
    if (!subscription || !subscription.stripe_customer_id) {
      throw new AppError('NOT_FOUND', '구독을 찾을 수 없습니다');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${SITE_URL}/premium`,
    });

    return { portalUrl: session.url };
  }

  // ── Webhook reconciliation ────────────────────────────────────────────────
  // These run with a SERVICE-ROLE supabase client (RLS bypassed) because the
  // webhook is unauthenticated by a user session — it is authenticated by the
  // Stripe signature instead. Resolve the Supabase user id from metadata.

  private resolveUserId(
    metadataHolder: { metadata?: Stripe.Metadata | null } | null | undefined,
    fallback?: string | null
  ): string | null {
    const fromMeta = metadataHolder?.metadata?.supabase_user_id;
    return (fromMeta || fallback || null) as string | null;
  }

  /** checkout.session.completed → create/confirm the subscription row. */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId =
      (session.client_reference_id as string | null) ||
      this.resolveUserId(session);
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!userId || !customerId) return;

    await this.subRepo.upsertByUser({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
    });
    await this.profileRepo.updateTier(userId, 'premium');
  }

  /** customer.subscription.created|updated|deleted → sync status + period. */
  async handleSubscriptionChange(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    // Prefer the metadata user id; otherwise look up by customer id.
    let userId = this.resolveUserId(subscription);
    if (!userId) {
      const row = await this.subRepo.findByStripeCustomer(customerId);
      userId = row?.user_id ?? null;
    }
    if (!userId) return;

    const status = subscription.status;
    const isEntitled = status === 'active' || status === 'trialing';

    // Stripe types put period fields on subscription items; fall back safely.
    const item = subscription.items?.data?.[0] as
      | (Stripe.SubscriptionItem & {
          current_period_start?: number;
          current_period_end?: number;
        })
      | undefined;
    const startUnix = item?.current_period_start;
    const endUnix = item?.current_period_end;

    await this.subRepo.upsertByUser({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status,
      current_period_start: startUnix
        ? new Date(startUnix * 1000).toISOString()
        : null,
      current_period_end: endUnix
        ? new Date(endUnix * 1000).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    });

    await this.profileRepo.updateTier(userId, isEntitled ? 'premium' : 'free');
  }
}

/** Re-export guards so route handlers can pre-flight without importing the SDK. */
export { isStripeConfigured, isPremiumPriceConfigured };
