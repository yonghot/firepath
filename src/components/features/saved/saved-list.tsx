'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SavedItem } from './saved-item';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiResponse, PaginatedResult, SavedCalculation } from '@/types/api.types';

export function SavedCalculationsList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['calculations'],
    queryFn: async (): Promise<PaginatedResult<SavedCalculation>> => {
      const res = await fetch('/api/calculations?limit=50');
      const json: ApiResponse<PaginatedResult<SavedCalculation>> = await res.json();
      if (!json.success) throw new Error('Failed to load');
      return json.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calculations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculations'] });
      toast.success('Calculation deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No saved calculations yet.</p>
        <p className="text-sm mt-1">Use the calculator and save your results!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((item) => (
        <SavedItem
          key={item.id}
          item={item}
          onDelete={(id) => deleteMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  );
}
