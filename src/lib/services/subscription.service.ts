import { SubscriptionRepository } from '@/lib/repositories/subscription.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { AppError } from '@/constants/error-codes';

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

  async createCheckout(userId: string) {
    const existing = await this.subRepo.findByUser(userId);
    if (existing && existing.status === 'active') {
      throw new AppError('SUB_ALREADY_ACTIVE');
    }

    // Stripe checkout would be created here
    // For prototype, return placeholder
    return { checkoutUrl: '/premium?checkout=pending' };
  }

  async createPortal(userId: string) {
    const subscription = await this.subRepo.findByUser(userId);
    if (!subscription) {
      throw new AppError('NOT_FOUND', '구독을 찾을 수 없습니다');
    }

    // Stripe portal would be created here
    return { portalUrl: '/premium?portal=pending' };
  }
}
