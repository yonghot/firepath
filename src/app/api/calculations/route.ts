import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CalculationRepository } from '@/lib/repositories/calculation.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { CalculationService } from '@/lib/services/calculation.service';
import { AppError } from '@/constants/error-codes';
import { z } from 'zod/v4';

const CreateCalculationSchema = z.object({
  name: z.string().min(1).max(100),
  input_params: z.object({
    currentAge: z.number().int().min(18).max(70),
    retirementAge: z.number().int().min(25).max(80),
    annualIncome: z.number().min(10000).max(1000000),
    currentNetWorth: z.number().min(0).max(10000000),
    savingsRate: z.number().min(0).max(0.9),
    annualExpenses: z.number().min(10000).max(500000),
    expectedReturn: z.number().min(0.01).max(0.15),
    inflation: z.number().min(0).max(0.1),
    safeWithdrawalRate: z.number().min(0.02).max(0.06),
  }),
  results: z.record(z.string(), z.unknown()),
  is_default: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));

    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    const result = await service.listByUser(user.id, page, limit);

    return NextResponse.json({ success: true, data: { ...result, page, limit } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error('GET /api/calculations error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateCalculationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    const record = await service.create(user.id, parsed.data);

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error('POST /api/calculations error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}
