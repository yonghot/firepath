import type { FIREType } from '@/types/fire.types';

export const FIRE_COLORS: Record<FIREType, string> = {
  lean: '#10B981',
  regular: '#2563EB',
  fat: '#7C3AED',
  coast: '#F59E0B',
  barista: '#EC4899',
} as const;

export const FIRE_LABELS: Record<FIREType, string> = {
  lean: 'Lean FIRE',
  regular: 'Regular FIRE',
  fat: 'Fat FIRE',
  coast: 'Coast FIRE',
  barista: 'Barista FIRE',
} as const;

export const FIRE_DESCRIPTIONS: Record<FIREType, string> = {
  lean: 'Minimalist retirement with 60% of current expenses',
  regular: 'Standard retirement covering 100% of current expenses',
  fat: 'Comfortable retirement with 150% of current expenses',
  coast: 'Investments grow to retirement goal without additional savings',
  barista: 'Part-time work covers 50% of expenses in semi-retirement',
} as const;

export const FIRE_TYPES: FIREType[] = ['lean', 'regular', 'fat', 'coast', 'barista'];
