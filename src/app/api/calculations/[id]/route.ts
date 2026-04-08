import { NextRequest, NextResponse } from 'next/server';
import { CalculationRepository } from '@/lib/repositories/calculation.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { CalculationService } from '@/lib/services/calculation.service';
import { requireAuth, handleApiError } from '@/lib/utils/api-handler';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAuth();
    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    const record = await service.getById(user.id, id);

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return handleApiError('GET /api/calculations/[id]', error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireAuth();
    const service = new CalculationService(
      new CalculationRepository(supabase),
      new ProfileRepository(supabase)
    );
    await service.delete(user.id, id);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleApiError('DELETE /api/calculations/[id]', error);
  }
}
