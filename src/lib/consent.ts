export const CONSENT_KEY = 'firepath_cookie_consent';

export const EEA_UK_CH: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];

const STORAGE_KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as const;

export function buildConsentDefaultScript(): string {
  const denied = STORAGE_KEYS.map((key) => `${key}:'denied'`).join(',');
  const stored = STORAGE_KEYS.map((key) => `${key}:v`).join(',');
  return (
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
    `gtag('consent','default',{${denied},region:${JSON.stringify(EEA_UK_CH)},wait_for_update:500});` +
    `(function(){var v='granted';try{if(localStorage.getItem('${CONSENT_KEY}')==='declined')v='denied';}catch(e){}` +
    `gtag('consent','default',{${stored}});})();`
  );
}

export const COUNTRY_COOKIE = 'visitor_country';
export const REOPEN_CONSENT_EVENT = 'firepath:reopen-consent';

export type ConsentChoice = 'accepted' | 'declined';
export type ConsentEvent = 'mount' | 'accept' | 'decline' | 'reopen';
export type ConsentState = Record<(typeof STORAGE_KEYS)[number], 'granted' | 'denied'>;

function consentState(value: 'granted' | 'denied'): ConsentState {
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}

export function isConsentRegion(country: string | null | undefined): boolean {
  return EEA_UK_CH.includes((country || '').toUpperCase());
}

export function readVisitorCountry(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface ConsentActions {
  show: boolean | null;
  update: ConsentState | null;
  store: ConsentChoice | null;
}

export function resolveConsentActions(input: {
  country: string | null | undefined;
  stored: ConsentChoice | null;
  event: ConsentEvent;
}): ConsentActions {
  if (isConsentRegion(input.country)) {
    return { show: input.event === 'mount' ? null : false, update: null, store: null };
  }
  switch (input.event) {
    case 'mount':
      return { show: null, update: input.stored === 'declined' ? consentState('denied') : null, store: null };
    case 'reopen':
      return { show: true, update: null, store: null };
    case 'accept':
      return { show: false, update: consentState('granted'), store: 'accepted' };
    case 'decline':
      return { show: false, update: consentState('denied'), store: 'declined' };
  }
}

export interface ConsentIO {
  country: () => string | null;
  readStored: () => ConsentChoice | null;
  writeStored: (value: ConsentChoice) => void;
  update: (state: ConsentState) => void;
  initAnalytics: () => void;
  setVisible: (visible: boolean) => void;
}

export function runConsentEvent(event: ConsentEvent, io: ConsentIO): void {
  const actions = resolveConsentActions({ country: io.country(), stored: io.readStored(), event });
  if (actions.update) io.update(actions.update);
  if (actions.store) io.writeStored(actions.store);
  if (actions.show !== null) io.setVisible(actions.show);
  if (event === 'mount') io.initAnalytics();
}

export interface ConsentWindow extends EventTarget {
  googlefc?: { callbackQueue?: Array<() => void>; showRevocationMessage?: () => void };
}

export function openConsentChoices(win: ConsentWindow, country: string | null | undefined): 'cmp' | 'banner' {
  if (isConsentRegion(country)) {
    const fc = (win.googlefc = win.googlefc || {});
    const queue = (fc.callbackQueue = fc.callbackQueue || []);
    queue.push(() => fc.showRevocationMessage?.());
    return 'cmp';
  }
  win.dispatchEvent(new Event(REOPEN_CONSENT_EVENT));
  return 'banner';
}
