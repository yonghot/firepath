import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppError } from '@/constants/error-codes';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Authenticate the current request and return supabase client + user.
 * Throws AppError('AUTH_REQUIRED') if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError('AUTH_REQUIRED');
  }
  return { supabase, user };
}

/**
 * Convert an error to a consistent API error response.
 * Handles AppError (mapped status) and unknown errors (500).
 */
export function handleApiError(routeLabel: string, error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }
  console.error(`${routeLabel} error:`, error);
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
    { status: 500 }
  );
}
