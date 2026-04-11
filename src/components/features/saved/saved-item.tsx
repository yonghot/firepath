'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { encodeState } from '@/lib/engine/url-state';
import type { FIREInput } from '@/types/fire.types';
import type { SavedCalculation } from '@/types/api.types';

interface SavedItemProps {
  item: SavedCalculation;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function SavedItem({ item, onDelete, isDeleting }: SavedItemProps) {
  const hash = encodeState(item.input_params as unknown as FIREInput);
  const date = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-xs text-muted-foreground">Saved on {date}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/#${hash}`}>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4 mr-1" />
              Load
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
