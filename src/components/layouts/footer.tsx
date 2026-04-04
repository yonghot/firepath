import Link from 'next/link';
import { Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Calculator</Link>
                <Link href="/premium" className="text-sm text-muted-foreground hover:text-foreground">Premium</Link>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Guides</h4>
              <nav className="flex flex-col gap-1">
                <Link href="/guide/what-is-coastfire" className="text-sm text-muted-foreground hover:text-foreground">CoastFIRE</Link>
                <Link href="/guide/what-is-leanfire" className="text-sm text-muted-foreground hover:text-foreground">LeanFIRE</Link>
                <Link href="/guide/what-is-fatfire" className="text-sm text-muted-foreground hover:text-foreground">FatFIRE</Link>
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
