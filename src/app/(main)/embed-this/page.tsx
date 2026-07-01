import type { Metadata } from 'next';
import { EmbedSnippet } from '@/components/common/embed-snippet';
import { breadcrumbJsonLd } from '@/components/common/json-ld';

export const metadata: Metadata = {
  title: 'Embed the FIRE Calculator',
  description:
    'Add the free FIREPath FIRE calculator to your own website or blog with a simple iframe embed. Copy the snippet — includes the attribution link.',
  alternates: { canonical: '/embed-this' },
};

const breadcrumb = breadcrumbJsonLd([
  { name: 'Home', path: '/' },
  { name: 'Embed the Calculator', path: '/embed-this' },
]);

export default function EmbedThisPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <h1 className="text-4xl font-bold mb-2">Embed the FIRE Calculator</h1>
      <p className="text-muted-foreground mb-6">
        Add the free FIREPath calculator to your own site or blog. It works on any
        platform that allows an <code>&lt;iframe&gt;</code> — no account required.
      </p>

      <EmbedSnippet />

      <div className="prose prose-neutral dark:prose-invert max-w-none mt-8">
        <h2>How it works</h2>
        <ul>
          <li>Paste the snippet anywhere in your page&apos;s HTML.</li>
          <li>
            The calculator loads from <code>/embed</code> with minimal chrome (no
            navigation, no ads).
          </li>
          <li>
            Keep the &quot;Powered by FIREPath&quot; line: it sits in your page (not
            inside the iframe) so the credit link is recognized by search engines.
          </li>
          <li>Adjust the <code>height</code> if your layout needs more room.</li>
        </ul>
      </div>
    </div>
  );
}
