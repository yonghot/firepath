import Link from 'next/link';
import { Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ManageConsentLink } from '@/components/common/manage-consent-link';
import { ClearMyDataLink } from '@/components/common/clear-my-data-link';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { PUBLISHER } from '@/lib/site';
import { isMessageEndpointConfigured } from '@/lib/feedback-endpoint';

const LINK = 'flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200';

export function Footer({ premiumAvailable = false }: { premiumAvailable?: boolean }) {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Flame className="h-5 w-5 text-[var(--fire-coast)]" />
              <span>FIREPath</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              All FIRE types in one beautiful calculator. Plan your path to financial independence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-8 lg:flex lg:gap-12">
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-semibold">Product</h4>
              <nav className="flex flex-col">
                <Link href="/" className={LINK}>Calculator</Link>
                {premiumAvailable && (
                  <Link href="/premium" className={LINK}>Premium</Link>
                )}
                <Link href="/embed-this" className={LINK}>Embed the Calculator</Link>
              </nav>
            </div>
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-semibold">Guides</h4>
              <nav className="flex flex-col">
                <Link href="/fire-guide" className={LINK}>The Complete FIRE Guide</Link>
                <Link href="/guide" className={LINK}>All Guides</Link>
                <Link href="/methodology" className={LINK}>How We Calculate</Link>
                <Link href="/fire-types#coast" className={LINK}>CoastFIRE</Link>
                <Link href="/fire-types#lean" className={LINK}>LeanFIRE</Link>
                <Link href="/fire-types#fat" className={LINK}>FatFIRE</Link>
              </nav>
            </div>
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-semibold">Company</h4>
              <nav className="flex flex-col">
                <Link href="/about" className={LINK}>About</Link>
                <Link href="/contact" className={LINK}>Contact</Link>
                {isMessageEndpointConfigured() && <FeedbackWidget />}
              </nav>
            </div>
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-semibold">Legal</h4>
              <nav className="flex flex-col">
                <Link href="/privacy" className={LINK}>Privacy Policy</Link>
                <Link href="/terms" className={LINK}>Terms of Service</Link>
                <ManageConsentLink />
                <ClearMyDataLink />
              </nav>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>
            &copy; FIREPath. Published by{' '}
            <a href={PUBLISHER.url} rel="noopener" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
              {PUBLISHER.name}
            </a>
            . For educational purposes only.
          </p>
          <p>
            Not financial advice. Past performance does not guarantee future results.{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- next/link hash jumps fire no hashchange, so the share hash would not be restored */}
            <a href="/#results-disclaimer" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
              Full disclaimer
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
