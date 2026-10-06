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
