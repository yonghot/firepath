'use client';

/**
 * EmbedSnippet — copy-paste "Embed this calculator" block.
 *
 * The snippet includes BOTH the <iframe> and a "Powered by FIREPath" attribution
 * <a> that lives in the PARENT page's HTML (not inside the iframe) — this is the
 * SEO-meaningful backlink (links inside an iframe are not credited to the parent
 * page). nofollow is acceptable; we keep it a normal link here.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

const SNIPPET = `<iframe
  src="${SITE_URL}/embed"
  title="FIREPath — Free FIRE Calculator"
  width="100%"
  height="900"
  style="border:1px solid #e5e5e5;border-radius:12px;max-width:840px"
  loading="lazy"
></iframe>
<p style="font-size:12px;text-align:center">
  <a href="${SITE_URL}" target="_blank" rel="noopener">Powered by FIREPath — free FIRE calculator</a>
</p>`;

export function EmbedSnippet() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the user can still select the text manually.
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Embed this calculator</h2>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste this into your site. Keep the &quot;Powered by FIREPath&quot; line —
        it lives in your page (not the iframe) so the link is credited correctly.
      </p>
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs font-mono">
        <code>{SNIPPET}</code>
      </pre>
    </div>
  );
}
