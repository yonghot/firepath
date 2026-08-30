'use client';

/**
 * ShareResultButtons — "Copy link" + Web Share for the current result (부속I T15).
 *
 * FIREPath already has a hash-based share mechanism (useUrlState() keeps
 * window.location.hash in sync with the current scenario on every input
 * change via history.replaceState — see src/hooks/use-url-state.ts /
 * src/lib/engine/url-state.ts). Per spec, firepath KEEPS that existing
 * mechanism as-is; this component only adds the buttons + the result_share
 * event on top of it. No new serialization, no URL rewrite on every
 * keystroke (the hash already updates live; this just copies/share()s
 * whatever window.location.href currently is at click time).
 *
 * Canonical stays the clean path (buildMeta() alternates.canonical never
 * includes the hash) — search engines never see the parameterized URL as
 * canonical, only real visitors who receive a shared link do.
 */

import { useState, useSyncExternalStore } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

/** Stable calc_type slug — mirrors CALC_TYPE in calculator-client.tsx / result-client.tsx. */
const CALC_TYPE = 'fire_timeline';
const emptySubscribe = (): (() => void) => () => {};

function useWebShareAvailable(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );
}

export function ShareResultButtons({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const canWebShare = useWebShareAvailable();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      trackEvent('result_share', { calc_type: CALC_TYPE, method: 'copy_link' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWebShare = async () => {
    try {
      await navigator.share({
        title: 'My FIRE timeline — FIREPath',
        text: 'See my FIRE (Financial Independence, Retire Early) timeline on FIREPath.',
        url: window.location.href,
      });
      trackEvent('result_share', { calc_type: CALC_TYPE, method: 'web_share' });
    } catch {
      // User cancelled the share sheet or the API errored — not a failure to report.
    }
  };

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <Button variant="outline" size="sm" onClick={handleCopyLink} aria-label="Copy link to this result">
        {copied ? (
          <Check className="h-4 w-4 mr-1" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
        )}
        {copied ? 'Copied!' : 'Copy link'}
      </Button>
      {canWebShare && (
        <Button variant="outline" size="sm" onClick={handleWebShare} aria-label="Share this result">
          <Share2 className="h-4 w-4 mr-1" aria-hidden="true" />
          Share
        </Button>
      )}
    </div>
  );
}
