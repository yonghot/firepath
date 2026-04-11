import { AppError } from '@/constants/error-codes';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Wrap a Supabase PostgrestError into a structured AppError('DB_ERROR').
 * The original error is logged server-side via console.error;
 * only a stable code/message is exposed to upstream layers.
 */
export function wrapDbError(context: string, error: PostgrestError): AppError {
  console.error(`[db:${context}] ${error.code ?? 'unknown'} ${error.message}`, {
    details: error.details,
    hint: error.hint,
  });
  return new AppError('DB_ERROR', context);
}
