import { NextRequest, NextResponse } from 'next/server';
import { CalculationRepository } from '@/lib/repositories/calculation.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { CalculationService } from '@/lib/services/calculation.service';
import { requireAuth, handleApiError } from '@/lib/utils/api-handler';
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
    const { supabase, user } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 10 : rawLimit));

    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    const result = await service.listByUser(user.id, page, limit);

    return NextResponse.json({ success: true, data: { ...result, page, limit } });
  } catch (error) {
    return handleApiError('GET /api/calculations', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '잘못된 JSON 형식입니다' } },
        { status: 400 }
      );
    }
    const parsed = CreateCalculationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
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
    return handleApiError('POST /api/calculations', error);
  }
}
