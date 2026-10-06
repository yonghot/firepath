import { isStripeConfigured, isPremiumPriceConfigured } from '@/lib/stripe/server';

export function isPremiumPurchasable(): boolean {
  return isStripeConfigured() && isPremiumPriceConfigured();
}
