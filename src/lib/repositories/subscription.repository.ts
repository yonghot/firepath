import type { SupabaseClient } from '@supabase/supabase-js';
import { wrapDbError } from './db-error';

export class SubscriptionRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw wrapDbError('subscription.findByUser', error);
    return data;
  }

  async findByStripeCustomer(stripeCustomerId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw wrapDbError('subscription.findByStripeCustomer', error);
    return data;
  }

  async create(data: {
    user_id: string;
    stripe_customer_id: string;
    stripe_subscription_id?: string;
    status: string;
  }) {
    const { data: record, error } = await this.supabase
      .from('subscriptions')
      .insert(data)
      .select()
      .single();

    if (error) throw wrapDbError('subscription.create', error);
    return record;
  }

  /**
   * Idempotent upsert keyed on user_id — used by the Stripe webhook so that
   * repeated/duplicate events converge to the same row. Updates customer/sub
   * ids, status, and period window in a single write.
   */
  async upsertByUser(data: {
    user_id: string;
    stripe_customer_id: string;
    stripe_subscription_id?: string | null;
    status: string;
    plan?: string;
    current_period_start?: string | null;
    current_period_end?: string | null;
    canceled_at?: string | null;
  }) {
    const { data: record, error } = await this.supabase
      .from('subscriptions')
      .upsert(
        {
          plan: 'premium',
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw wrapDbError('subscription.upsertByUser', error);
    return record;
  }

  async updateStatus(subscriptionId: string, status: string, canceledAt?: string) {
    const update: Record<string, unknown> = { status };
    if (canceledAt) update.canceled_at = canceledAt;

    const { error } = await this.supabase
      .from('subscriptions')
      .update(update)
      .eq('stripe_subscription_id', subscriptionId);

    if (error) throw wrapDbError('subscription.updateStatus', error);
  }

  async updatePeriod(subscriptionId: string, start: string, end: string) {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({ current_period_start: start, current_period_end: end })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) throw wrapDbError('subscription.updatePeriod', error);
  }
}
