export const TERMS_CONSENT_KEY = 'firepath_terms_consent';

export const AGREE_ALERT = 'Tick the box to agree to the Terms of Use and see your numbers.';

interface StoredConsent {
  accepted: true;
  timestamp: string;
}

interface ConsentStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function browserStorage(): ConsentStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTermsConsent(storage: ConsentStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(TERMS_CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredConsent;
    return parsed?.accepted === true && typeof parsed.timestamp === 'string';
  } catch {
    return false;
  }
}

export function writeTermsConsent(storage: ConsentStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  const payload: StoredConsent = { accepted: true, timestamp: new Date().toISOString() };
  try {
    storage.setItem(TERMS_CONSENT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function evaluateAgreeAttempt(checked: boolean): {
  accepted: boolean;
  alert: string | null;
  focusCheckbox: boolean;
} {
  if (!checked) return { accepted: false, alert: AGREE_ALERT, focusCheckbox: true };
  return { accepted: true, alert: null, focusCheckbox: false };
}

const listeners = new Set<() => void>();
let agreedThisVisit = false;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeTermsConsent(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', listener);
  };
}

export function getTermsConsentSnapshot(): boolean {
  return agreedThisVisit || readTermsConsent();
}

export function getTermsConsentServerSnapshot(): boolean | null {
  return null;
}

export function acceptTerms(): void {
  agreedThisVisit = true;
  writeTermsConsent();
  notify();
}
