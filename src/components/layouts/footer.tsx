import Link from 'next/link';
import { Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ManageConsentLink } from '@/components/common/manage-consent-link';
import { ClearMyDataLink } from '@/components/common/clear-my-data-link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Flame className="h-5 w-5 text-[var(--fire-coast)]" />
              <span>FIREPath</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              All FIRE types in one beautiful calculator. Plan your path to financial independence.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Product</h4>
              <nav className="flex flex-col gap-1">
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Calculator</Link>
                <Link href="/premium" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Premium</Link>
                <Link href="/embed-this" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Embed the Calculator</Link>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Guides</h4>
              <nav className="flex flex-col gap-1">
                <Link href="/fire-guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">The Complete FIRE Guide</Link>
                <Link href="/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">All Guides</Link>
                <Link href="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">How We Calculate</Link>
                <Link href="/fire-types#coast" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">CoastFIRE</Link>
                <Link href="/fire-types#lean" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">LeanFIRE</Link>
                <Link href="/fire-types#fat" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">FatFIRE</Link>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Company</h4>
              <nav className="flex flex-col gap-1">
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">About</Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Contact</Link>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Legal</h4>
              <nav className="flex flex-col gap-1">
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Privacy Policy</Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Terms of Service</Link>
                <ManageConsentLink />
                <ClearMyDataLink />
              </nav>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FIREPath. For educational purposes only.</p>
          <p>Not financial advice. Past performance does not guarantee future results.</p>
        </div>
      </div>
    </footer>
  );
}
