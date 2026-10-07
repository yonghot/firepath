'use client';

import { useEffect, useRef } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { encodeState, decodeState, reconcileHash } from '@/lib/engine/url-state';

export function useUrlState() {
  const { input, setInput } = useCalculatorStore();
  const initialized = useRef(false);

  // On mount: parse URL hash → store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const hash = window.location.hash.slice(1);
    if (hash) {
      const decoded = decodeState(hash);
      if (decoded) {
        setInput(decoded);
      }
    }
  }, [setInput]);

  // On input change: store → URL hash
  useEffect(() => {
    if (!initialized.current) return;
    const hash = encodeState(input);
    const newUrl = hash ? `#${hash}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [input]);

  // An in-page anchor jump (e.g. "Read the full disclaimer") replaces the hash; put the share state back.
  useEffect(() => {
    const onHashChange = () => {
      const restored = reconcileHash(window.location.hash, useCalculatorStore.getState().input);
      if (restored === null) return;
      window.history.replaceState(null, '', restored ? `#${restored}` : window.location.pathname);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
}
