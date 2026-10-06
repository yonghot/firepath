import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { ContactForm } from '@/components/features/contact/contact-form';
import { buildMeta } from '@/lib/seo';
import { PUBLISHER } from '@/lib/site';
import { robotsForPath } from '@/lib/noindex-paths';
import { Breadcrumbs } from '@/components/common/breadcrumbs';

export const metadata: Metadata = buildMeta({
  title: 'Contact FIREPath: Email the Publisher or Report an Error',
  description:
    'Email the FIREPath publisher with a question, feedback or a correction. Include the page address and the figure or statement in question.',
  path: '/contact',
  robots: robotsForPath('/contact'),
});

export default function ContactPage() {
  const formEnabled = Boolean(process.env.FEEDBACK_ENDPOINT?.trim());

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Breadcrumbs items={[{ name: 'Contact', path: '/contact' }]} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Contact FIREPath</h1>
        <p className="text-muted-foreground">
          FIREPath is published by{' '}
          <a
            href={PUBLISHER.url}
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors duration-200"
          >
            {PUBLISHER.name}
          </a>
          . For questions or feedback about the calculator, email the publisher.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <a
          href={`mailto:${PUBLISHER.email}`}
          className="font-medium underline underline-offset-4 hover:text-foreground transition-colors duration-200"
        >
          {PUBLISHER.email}
        </a>
      </div>
      <p className="mb-8 text-sm text-muted-foreground">{PUBLISHER.correctionRequest}</p>

      {formEnabled && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Or send a message here</h2>
          <ContactForm />
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        FIREPath is an educational tool — we do not provide personalized financial
        advice. For investment-specific guidance, please consult a qualified financial
        advisor.
      </p>
    </div>
  );
}
