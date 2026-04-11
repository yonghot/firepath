'use client';

import {
  useDeleteCalculation,
  useSavedCalculations,
} from '@/hooks/use-calculations';
import { SavedItem } from './saved-item';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SavedCalculationsList() {
  const { data, isLoading } = useSavedCalculations();
  const deleteMutation = useDeleteCalculation();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Calculation deleted'),
      onError: (error) => toast.error(error.message),
    });
  };

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
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  );
}
