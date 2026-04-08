'use client';

import Link from 'next/link';
import { Flame, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Calculator' },
  { href: '/guide', label: 'Guides' },
  { href: '/premium', label: 'Premium' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Flame className="h-6 w-6 text-[var(--fire-coast)]" />
          <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-light)] bg-clip-text text-transparent">
            FIREPath
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <Link href="/saved">
                  <Button variant="outline" size="sm">
                    <User className="h-3.5 w-3.5 mr-1" />
                    Saved
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )
          )}
        </nav>

        {/* Mobile nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-accent" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col gap-4 mt-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium py-2"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center justify-between">
                {!loading && (
                  user ? (
                    <div className="flex items-center gap-2">
                      <Link href="/saved" onClick={() => setOpen(false)}>
                        <Button variant="outline" size="sm">
                          <User className="h-3.5 w-3.5 mr-1" />
                          Saved
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => { handleSignOut(); setOpen(false); }}>
                        <LogOut className="h-3.5 w-3.5 mr-1" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <Link href="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline">
                        Sign In
                      </Button>
                    </Link>
                  )
                )}
                <ThemeToggle />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
