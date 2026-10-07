import { formatCurrencyFull, formatPercent } from '@/lib/utils/format';

export type FieldUnit = 'dollar' | 'percent' | 'year';

export interface FieldDraft {
  text: string;
  base: number;
}

export function formatFieldValue(value: number, unit: FieldUnit): string {
  switch (unit) {
    case 'dollar':
      return formatCurrencyFull(value);
    case 'percent':
      return formatPercent(value);
    case 'year':
      return String(value);
  }
}

export function parseFieldText(raw: string, unit: FieldUnit): number | null {
  const cleaned = raw.replace(/[$,%\s]/g, '');
  if (cleaned === '') return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  // Rounded so 1.1 points becomes 0.011, not 0.011000000000000001, in the share URL.
  return unit === 'percent' ? Number((num / 100).toFixed(6)) : num;
}

export function startDraft(text: string, base: number): FieldDraft {
  return { text, base };
}

/** The draft only counts while the value it was typed against is still current. */
export function fieldText(draft: FieldDraft | null, value: number, unit: FieldUnit): string {
  return draft !== null && draft.base === value ? draft.text : formatFieldValue(value, unit);
}

/** The value to report on blur or Enter, clamped to the field's range; null when there is nothing to change. */
export function commitDraft(
  draft: FieldDraft | null,
  value: number,
  unit: FieldUnit,
  min: number,
  max: number,
): number | null {
  if (draft === null || draft.base !== value) return null;
  const parsed = parseFieldText(draft.text, unit);
  if (parsed === null) return null;
  const clamped = Math.min(max, Math.max(min, parsed));
  return clamped === value ? null : clamped;
}
