'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  PaginatedResult,
  SavedCalculation,
} from '@/types/api.types';
import type { FIREInput, FIREOutput } from '@/types/fire.types';

const CALCULATIONS_KEY = ['calculations'] as const;

interface ApiErrorShape {
  code: string;
  message: string;
}

class ApiClientError extends Error {
  readonly code: string;
  constructor({ code, message }: ApiErrorShape) {
    super(message);
    this.code = code;
    this.name = 'ApiClientError';
  }
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new ApiClientError(json.error);
  return json.data;
}

export interface SaveCalculationInput {
  name: string;
  input_params: FIREInput;
  results: FIREOutput['results'];
  is_default?: boolean;
}

export function useSavedCalculations(limit = 50) {
  return useQuery({
    queryKey: [...CALCULATIONS_KEY, { limit }],
    queryFn: async () => {
      const res = await fetch(`/api/calculations?limit=${limit}`);
      return parseApiResponse<PaginatedResult<SavedCalculation>>(res);
    },
  });
}

export function useSaveCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SaveCalculationInput) => {
      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: false, ...body }),
      });
      return parseApiResponse<SavedCalculation>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALCULATIONS_KEY });
    },
  });
}

export function useDeleteCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calculations/${id}`, { method: 'DELETE' });
      await parseApiResponse<null>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALCULATIONS_KEY });
    },
  });
}

export { ApiClientError };
