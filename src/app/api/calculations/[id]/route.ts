import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CalculationRepository } from '@/lib/repositories/calculation.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { CalculationService } from '@/lib/services/calculation.service';
import { AppError } from '@/constants/error-codes';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      );
    }

    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    const record = await service.getById(user.id, id);

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error('GET /api/calculations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      );
    }

    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    await service.delete(user.id, id);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error('DELETE /api/calculations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}
