import { NextResponse } from 'next/server';
import { SubscriptionRepository } from '@/lib/repositories/subscription.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { requireAuth, handleApiError } from '@/lib/utils/api-handler';

export async function POST() {
  try {
    const { supabase, user } = await requireAuth();
    const service = new SubscriptionService(
      new SubscriptionRepository(supabase),
      new ProfileRepository(supabase)
    );
    const result = await service.createPortal(user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError('POST /api/subscriptions/portal', error);
  }
}
