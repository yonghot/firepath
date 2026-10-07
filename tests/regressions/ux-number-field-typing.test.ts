import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SLIDER_CONFIGS } from '@/constants/fire-defaults';
import {
  commitDraft,
  fieldText,
  formatFieldValue,
  parseFieldText,
  startDraft,
  type FieldDraft,
} from '@/lib/utils/number-field';
import { SliderInput } from '@/components/features/calculator/slider-input';
import { renderWithProviders } from './helpers/render-pages';

const ROOT = path.resolve(__dirname, '../..');
const source = readFileSync(path.join(ROOT, 'src/components/features/calculator/slider-input.tsx'), 'utf8');

const income = SLIDER_CONFIGS.find((c) => c.key === 'annualIncome')!;
const age = SLIDER_CONFIGS.find((c) => c.key === 'currentAge')!;
const swr = SLIDER_CONFIGS.find((c) => c.key === 'safeWithdrawalRate')!;

/** Replays the field's handlers the way the component wires them: a keystroke stores a draft, blur or Enter commits it. */
function session(config: { min: number; max: number; unit: 'dollar' | 'percent' | 'year' }, initial: number) {
  let value = initial;
  let draft: FieldDraft | null = null;
  const committed: number[] = [];
  return {
    get value() {
      return value;
    },
    get committed() {
      return committed;
    },
    get shown() {
      return fieldText(draft, value, config.unit);
    },
    type(text: string) {
      draft = startDraft(text, value);
    },
    commit() {
      const next = commitDraft(draft, value, config.unit, config.min, config.max);
      draft = null;
      if (next !== null) {
        value = next;
        committed.push(next);
      }
    },
    external(next: number) {
      value = next;
    },
  };
}

describe('UX P1-1: number fields accept typing one keystroke at a time (K26-5)', () => {
  it('keeps every intermediate keystroke on screen even when it is below the minimum', () => {
    expect(income.min).toBe(10000);
    const field = session(income, 80000);
    const typed = ['1', '12', '120', '1200', '12000', '120000'];
    for (const text of typed) {
      field.type(text);
      expect(field.shown, `after typing "${text}"`).toBe(text);
    }
    expect(field.committed).toEqual([]);
    field.commit();
    expect(field.value).toBe(120000);
    expect(field.committed).toEqual([120000]);
    expect(field.shown).toBe(formatFieldValue(120000, 'dollar'));
  });

  it('the exact reported case: typing 1, 12, 120, 1200 into a field whose minimum is 1000 ends at 1200, not at the old value', () => {
    const config = { min: 1000, max: 100000, unit: 'dollar' as const };
    const field = session(config, 45000);
    for (const text of ['1', '12', '120', '1200']) {
      field.type(text);
      expect(field.shown).toBe(text);
    }
    field.commit();
    expect(field.value).toBe(1200);
  });

  it('typing a two-digit age passes through the one-digit state that is below the minimum of 18', () => {
    expect(age.min).toBe(18);
    const field = session(age, 30);
    field.type('4');
    expect(field.shown).toBe('4');
    field.type('45');
    expect(field.shown).toBe('45');
    field.commit();
    expect(field.value).toBe(45);
  });

  it('clamps an out-of-range commit to the nearest bound instead of dropping it', () => {
    expect(commitDraft(startDraft('5', 80000), 80000, 'dollar', income.min, income.max)).toBe(income.min);
    expect(commitDraft(startDraft('99999999', 80000), 80000, 'dollar', income.min, income.max)).toBe(income.max);
    expect(commitDraft(startDraft('12', 30), 30, 'year', age.min, age.max)).toBe(age.min);
    expect(commitDraft(startDraft('200', 30), 30, 'year', age.min, age.max)).toBe(age.max);
  });

  it('reads dollars, commas and percent signs, and scales percent fields from points to a fraction', () => {
    expect(parseFieldText('$1,200', 'dollar')).toBe(1200);
    expect(parseFieldText(' 4.5% ', 'percent')).toBe(0.045);
    expect(parseFieldText('1.1', 'percent')).toBe(0.011);
    expect(commitDraft(startDraft('5', 0.04), 0.04, 'percent', swr.min, swr.max)).toBe(0.05);
    expect(commitDraft(startDraft('9', 0.04), 0.04, 'percent', swr.min, swr.max)).toBe(swr.max);
  });

  it('text that is not a finite number never changes the value: it reverts to the formatted current value', () => {
    for (const text of ['', '   ', '$', 'abc', '1e999', '-', '--5']) {
      const field = session(income, 80000);
      field.type(text);
      field.commit();
      expect(field.value, `"${text}"`).toBe(80000);
      expect(field.committed, `"${text}"`).toEqual([]);
      expect(field.shown).toBe(formatFieldValue(80000, 'dollar'));
    }
  });

  it('committing the value that is already set does not report a change', () => {
    const field = session(income, 80000);
    field.type('80000');
    field.commit();
    expect(field.committed).toEqual([]);
  });

  it('a draft is dropped when the value prop changes underneath it (slider drag, preset, reset)', () => {
    const field = session(income, 80000);
    field.type('12');
    field.external(150000);
    expect(field.shown).toBe(formatFieldValue(150000, 'dollar'));
    field.commit();
    expect(field.value).toBe(150000);
    expect(field.committed).toEqual([]);
  });

  it('without a draft the field shows the formatted value, so the slider and presets still drive it', () => {
    expect(fieldText(null, 80000, 'dollar')).toBe('$80,000');
    expect(fieldText(null, 0.04, 'percent')).toBe('4.0%');
    expect(fieldText(null, 30, 'year')).toBe('30');
  });
});

describe('UX P1-1: the component uses the draft model, not the per-keystroke range guard', () => {
  it('no longer filters keystrokes by range before reporting them', () => {
    expect(source).not.toMatch(/parsed\s*>=\s*min\s*&&\s*parsed\s*<=\s*max/);
    expect(source).toMatch(/onBlur=\{/);
    expect(source).toMatch(/e\.key === 'Enter'/);
    expect(source).toMatch(/commitDraft\(/);
    expect(source).toMatch(/startDraft\(/);
  });

  it('the slider still reports every drag value straight through', () => {
    expect(source).toMatch(/onValueChange=\{\(val\) => \{[\s\S]*?onChange\(v\)/);
  });

  it('renders the formatted value, a numeric keypad hint and the existing accessible names', () => {
    const html = renderWithProviders(
      createElement(SliderInput, {
        label: 'Annual Income',
        value: 80000,
        min: income.min,
        max: income.max,
        step: income.step,
        unit: 'dollar',
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('value="$80,000"');
    expect(html).toMatch(/inputMode="decimal"|inputmode="decimal"/);
    expect(html).toContain('aria-label="Annual Income value"');
    expect(html).toContain('aria-label="Annual Income"');
  });

  it('whole-number fields ask for the digit keypad', () => {
    const html = renderWithProviders(
      createElement(SliderInput, {
        label: 'Current Age',
        value: 30,
        min: age.min,
        max: age.max,
        step: 1,
        unit: 'year',
        onChange: () => undefined,
      }),
    );
    expect(html).toMatch(/inputMode="numeric"|inputmode="numeric"/);
  });
});
