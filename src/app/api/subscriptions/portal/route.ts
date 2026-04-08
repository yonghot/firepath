import { NextResponse } from 'next/server';
import { requireAuth, handleApiError, createSubscriptionService } from '@/lib/utils/api-handler';

export async function POST() {
  try {
    const { supabase, user } = await requireAuth();
    const service = createSubscriptionService(supabase);
    const result = await service.createPortal(user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError('POST /api/subscriptions/portal', error);
  }
}
