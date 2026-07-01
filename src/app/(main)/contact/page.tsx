import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { ContactForm } from '@/components/features/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Questions, corrections, or feedback about FIREPath? Send us a message. We read every submission and aim to respond promptly.',
  alternates: { canonical: '/contact' },
  robots: { index: true, follow: true },
};

/**
 * /contact page — AdSense-approval-ready contact page.
 *
 * The contact email is shown only when the owner sets NEXT_PUBLIC_CONTACT_EMAIL.
 * No email is fabricated here. The form always renders so reviewers (and users)
 * see a working contact mechanism regardless of env configuration.
 */
export default function ContactPage() {
  // Shown only when the owner configures this env var — never fabricated.
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
        <p className="text-muted-foreground">
          Questions, corrections, or feedback about our estimates? Send us a message.
          We read every submission and aim to respond as quickly as we can.
        </p>
      </div>

      {/* Optional direct email — only rendered when env is set */}
      {contactEmail && (
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground">You can also email us directly at </span>
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium underline underline-offset-4 hover:text-foreground transition-colors duration-200"
          >
            {contactEmail}
          </a>
        </div>
      )}

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
