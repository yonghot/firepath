'use client';

/**
 * useCalculatorPersistence — localStorage save/restore for calculator inputs
 * (부속I T16).
 *
 * Client-side only — no consent-surface change (localStorage functional
 * storage, no new pixels, no cookies). Each calc_type gets its own key
 * (`cc_state_{calc_type}`), versioned with a `schema` field so a future shape
 * change can detect and discard stale saves rather than crash on them.
 *
 * FIREPath is NOT IS_SENSITIVE_SITE, so full input state is stored for
 * `fire_timeline`. Any FUTURE sensitive calc_type added to this repo must
 * pass an explicit `sensitiveFieldAllowlist` (see the healthcare-bridge
 * caller) rather than persisting raw fields — mirrors the legalcostcalc
 * "OFF by default for matter-detail fields" / DentalCostFinder "procedure and
 * city only" rules from 부속I T16, even though neither applies to this repo
 * today.
 *
 * A separate lightweight index (`cc_recent`) tracks the last 5
 * calc_type+date entries across ALL calculators on this site for the
 * homepage "Recent calculations" list — never stores result VALUES, only
 * calc_type + ISO date + a link path, per spec.
 */

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

const SCHEMA_VERSION = 1;
const RECENT_KEY = 'cc_recent';
const MAX_RECENT = 5;

interface StoredState<T> {
  schema: number;
  savedAt: string;
  data: T;
}

export interface RecentEntry {
  calcType: string;
  savedAt: string;
  path: string;
}

function stateKey(calcType: string): string {
  return `cc_state_${calcType}`;
}

/** Every localStorage key this app writes for calculator persistence — used by "Clear my data". */
function allPersistenceKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('cc_')) keys.push(key);
    }
  } catch {
    // localStorage unavailable — nothing to enumerate.
  }
  return keys;
}

/** Wipes every `cc_*` key (all calculator persistence + the recent-calculations index + the T02 traffic marker). */
export function clearAllCalculatorData(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of allPersistenceKeys()) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage unavailable — nothing to clear.
  }
}

function readRecent(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e && typeof e.calcType === 'string' && typeof e.savedAt === 'string' && typeof e.path === 'string'
    );
  } catch {
    return [];
  }
}

function writeRecent(calcType: string, path: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRecent().filter((e) => e.calcType !== calcType);
    const next = [{ calcType, savedAt: new Date().toISOString(), path }, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — recent-calculations index simply won't update.
  }
}

/** Reads the "Recent calculations" index (max 5, most-recent-first). No result values ever stored. */
export function getRecentCalculations(): RecentEntry[] {
  return readRecent();
}

interface UseCalculatorPersistenceOptions<T> {
  calcType: string;
  /** Site-relative path to link "Recent calculations" / the banner's "apply" target to. */
  path: string;
  /** Called when the user accepts the "Continue where you left off" banner. */
  onRestore: (data: T) => void;
}

interface UseCalculatorPersistenceResult<T> {
  /** Non-null once a valid same-schema save is found on mount; null otherwise (or after dismiss/apply). */
  pendingRestore: T | null;
  /** Applies pendingRestore via onRestore(), fires state_restored, and clears the pending banner. */
  applyRestore: () => void;
  /** Dismisses the banner without applying — the saved state remains in storage for next visit. */
  dismissRestore: () => void;
  /** Call after a real user-driven input change to persist the latest state + update the recent-calculations index. */
  save: (data: T) => void;
}

/**
 * Generic per-calc_type persistence hook.
 *
 * `T` should be a plain JSON-serializable input shape (e.g. FIREInput).
 */
export function useCalculatorPersistence<T>({
  calcType,
  path,
  onRestore,
}: UseCalculatorPersistenceOptions<T>): UseCalculatorPersistenceResult<T> {
  const [pendingRestore, setPendingRestore] = useState<T | null>(null);

  // Read once on mount — deferred via queueMicrotask (repo-wide pattern for
  // avoiding the react-hooks/set-state-in-effect cascading-render lint
  // warning; see TermsGate / CookieConsentBanner / AdSlot).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(stateKey(calcType));
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredState<T>;
        if (parsed?.schema === SCHEMA_VERSION && parsed.data) {
          setPendingRestore(parsed.data);
        }
      } catch {
        // Corrupt/unreadable save — treat as no saved state.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [calcType]);

  const save = useCallback(
    (data: T) => {
      if (typeof window === 'undefined') return;
      try {
        const payload: StoredState<T> = { schema: SCHEMA_VERSION, savedAt: new Date().toISOString(), data };
        window.localStorage.setItem(stateKey(calcType), JSON.stringify(payload));
        writeRecent(calcType, path);
      } catch {
        // localStorage unavailable (private mode / quota) — non-fatal, just don't persist.
      }
    },
    [calcType, path]
  );

  const applyRestore = useCallback(() => {
    if (pendingRestore === null) return;
    onRestore(pendingRestore);
    trackEvent('state_restored', { calc_type: calcType });
    setPendingRestore(null);
  }, [pendingRestore, onRestore, calcType]);

  const dismissRestore = useCallback(() => {
    setPendingRestore(null);
  }, []);

  return { pendingRestore, applyRestore, dismissRestore, save };
}
