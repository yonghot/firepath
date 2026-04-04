import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'FIREPath — All FIRE Types in One Beautiful Calculator',
    template: '%s | FIREPath',
  },
  description:
    'Compare 5 FIRE types (Lean, Regular, Fat, Coast, Barista) on one interactive timeline. Free FIRE calculator with real-time charts.',
  keywords: ['FIRE calculator', 'financial independence', 'early retirement', 'LeanFIRE', 'FatFIRE', 'CoastFIRE', 'BaristaFIRE'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.webmanifest',
  themeColor: '#065F53',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FIREPath',
  },
  openGraph: {
    title: 'FIREPath — All FIRE Types in One Beautiful Calculator',
    description: 'Compare 5 FIRE types on one interactive timeline.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
