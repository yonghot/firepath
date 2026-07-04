'use client';

/**
 * EmbedResizeScript — postMessage height-resize for the /embed iframe.
 *
 * 부속P CODE-03(d): posts the iframe's content height to the parent window on
 * mount, on ResizeObserver-detected content changes (slider interactions,
 * result recalculation, answer-block content), and on window resize, so a
 * host page can listen for the message and set the iframe's height to match
 * — avoiding a fixed-height iframe that either clips content or leaves dead
 * space (the #1 cause of embed uninstalls). This component posts only a
 * plain { type, height } message; it never reads or writes anything on the
 * PARENT page (no cross-origin DOM access, no host-page tracking).
 *
 * The corresponding host-side listener snippet is documented in
 * EmbedSnippet / /embed-this (comment only — actual host integration is the
 * embedder's responsibility; this component's postMessage contract is
 * intentionally simple: `{ type: 'firepath:resize', height: <number> }`).
 */

import { useEffect } from 'react';

const MESSAGE_TYPE = 'firepath:resize';

export function EmbedResizeScript() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    let lastHeight = 0;
    const postHeight = () => {
      const height = document.documentElement.scrollHeight;
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: MESSAGE_TYPE, height }, '*');
    };

    postHeight();

    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.documentElement);

    window.addEventListener('resize', postHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', postHeight);
    };
  }, []);

  return null;
}
