import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { ContactForm } from '@/components/features/contact/contact-form';
import { buildMeta } from '@/lib/seo';
import { PUBLISHER } from '@/lib/site';
import { Breadcrumbs } from '@/components/common/breadcrumbs';

export const metadata: Metadata = buildMeta({
  title: 'Contact Us: Reach the FIREPath Support Team Directly',
  description:
    'Questions, corrections, or feedback about FIREPath? Send us a message — we read every submission and aim to respond promptly.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Breadcrumbs items={[{ name: 'Contact', path: '/contact' }]} />
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
        <p className="text-muted-foreground">
          Questions, corrections, or feedback about our estimates? Send us a message.
          We read every submission and aim to respond as quickly as we can.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-2 text-sm">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <span className="text-muted-foreground">You can also email us directly at </span>
        <a
          href={`mailto:${PUBLISHER.email}`}
          className="font-medium underline underline-offset-4 hover:text-foreground transition-colors duration-200"
        >
          {PUBLISHER.email}
        </a>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ContactForm />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        FIREPath is an educational tool — we do not provide personalized financial
        advice. For investment-specific guidance, please consult a qualified financial
        advisor.
      </p>
    </div>
  );
}
