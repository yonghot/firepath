'use client';

import { useSyncExternalStore } from 'react';
import {
  getTermsConsentServerSnapshot,
  getTermsConsentSnapshot,
  subscribeTermsConsent,
} from '@/lib/terms-consent';

export function useTermsConsent(): boolean | null {
  return useSyncExternalStore(subscribeTermsConsent, getTermsConsentSnapshot, getTermsConsentServerSnapshot);
}
