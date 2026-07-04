'use client';

/**
 * EmbedSnippet — copy-paste "Embed this calculator" block.
 *
 * The snippet includes BOTH the <iframe> and a "Powered by FIREPath" attribution
 * <a> that lives in the PARENT page's HTML (not inside the iframe) — this is the
 * SEO-meaningful backlink (links inside an iframe are not credited to the parent
 * page).
 *
 * 부속I T04 / 부속P CODE-03 link-policy audit: the attribution link is
 * rel="nofollow ugc" (Google's explicit stance: widget/embed-distributed
 * links must be nofollow or they are a link-scheme violation; "ugc" rather
 * than "sponsored" because no payment changes hands for an embed install),
 * the anchor text is the brand name ("FIREPath") rather than a keyword
 * phrase like "fire calculator", and the href carries
 * utm_source=embed&utm_medium=widget&utm_campaign={document.location.hostname}
 * (resolved by the embedder's own page at copy time isn't possible statically,
 * so we use a stable "embed" campaign value here; per-host attribution is
 * captured server-side via document.referrer on the /embed iframe's own
 * embed_loaded event instead). A small inline script listens for the
 * `firepath:resize` postMessage from the iframe (EmbedResizeScript) and
 * updates the iframe's height so the widget never clips or leaves dead
 * space on the host page.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');
const ATTRIBUTION_URL = `${SITE_URL}/?utm_source=embed&utm_medium=widget&utm_campaign=embed`;

const SNIPPET = `<iframe
  id="firepath-embed"
  src="${SITE_URL}/embed"
  title="FIREPath — Free FIRE Calculator"
  width="100%"
  height="900"
  style="border:1px solid #e5e5e5;border-radius:12px;max-width:840px"
  loading="lazy"
></iframe>
<p style="font-size:12px;text-align:center">
  <a href="${ATTRIBUTION_URL}" target="_blank" rel="nofollow ugc noopener">Powered by FIREPath</a> — free FIRE calculator
</p>
<script>
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'firepath:resize') return;
    var frame = document.getElementById('firepath-embed');
    if (frame && typeof e.data.height === 'number') {
      frame.style.height = e.data.height + 'px';
    }
  });
</script>`;

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
