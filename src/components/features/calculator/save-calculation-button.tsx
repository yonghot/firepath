'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCalculatorStore } from '@/stores/calculator.store';
import {
  ApiClientError,
  useSaveCalculation,
} from '@/hooks/use-calculations';
import { toast } from 'sonner';
import Link from 'next/link';

export function SaveCalculationButton() {
  const { user, loading: authLoading } = useAuth();
  const { input, output } = useCalculatorStore();
  const saveMutation = useSaveCalculation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  if (authLoading || !user) return null;

  const handleSave = async () => {
    const calcName = name.trim() || `Calculation ${new Date().toLocaleDateString()}`;

    try {
      await saveMutation.mutateAsync({
        name: calcName,
        input_params: input,
        results: output.results,
      });

      toast.success(`"${calcName}" saved`);
      setSaved(true);
      setIsOpen(false);
      setName('');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      const message =
        error instanceof ApiClientError && error.code === 'LIMIT_EXCEEDED'
          ? 'Maximum 5 saved calculations (free tier)'
          : error instanceof Error
            ? error.message
            : 'Failed to save';
      toast.error(message);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
          Saved
        </Button>
        <Link href="/saved" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View saved &rarr;
        </Link>
      </div>
    );
  }

  if (isOpen) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Calculation name"
          className="h-8 w-44 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <Button size="sm" className="h-8" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
      <Save className="h-3.5 w-3.5 mr-1" />
      Save to Account
    </Button>
  );
}
