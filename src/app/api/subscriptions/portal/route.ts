import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionRepository } from '@/lib/repositories/subscription.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { AppError } from '@/constants/error-codes';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      );
    }

    const service = new SubscriptionService(
      new SubscriptionRepository(supabase),
      new ProfileRepository(supabase)
    );
    const result = await service.createPortal(user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error('POST /api/subscriptions/portal error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}
