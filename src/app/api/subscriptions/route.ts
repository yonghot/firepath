import { NextResponse } from 'next/server';
import { requireAuth, handleApiError, createSubscriptionService } from '@/lib/utils/api-handler';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    const service = createSubscriptionService(supabase);
    const result = await service.getCurrent(user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError('GET /api/subscriptions', error);
  }
}

export async function POST() {
  try {
    const { supabase, user } = await requireAuth();
    const service = createSubscriptionService(supabase);
    const result = await service.createCheckout(user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError('POST /api/subscriptions', error);
  }
}
