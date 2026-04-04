import { Flame } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
        <Flame className="h-7 w-7 text-[var(--fire-coast)]" />
        <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-light)] bg-clip-text text-transparent">
          FIREPath
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
