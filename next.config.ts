import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel injects VERCEL_ENV (server-only: "production" | "preview" |
  // "development") but does NOT expose it to the client by default. The GA4
  // production-hostname gate (부속I T01, cookie-consent-banner.tsx) needs it
  // client-side, so mirror it into a NEXT_PUBLIC_ var at build time. Falls
  // through to whatever NEXT_PUBLIC_VERCEL_ENV is already set to (e.g. local
  // .env) when VERCEL_ENV is absent (non-Vercel builds).
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV,
  },
  async rewrites() {
    return [
      { source: '/:key([A-Za-z0-9_-]{8,128}).txt', destination: '/api/indexnow-key/:key' },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes EXCEPT /embed and /embed/* (which must be frameable); /embed-this and /embed-thing keep them
        source: '/((?!embed(?:/|$)).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Prevents full URL (with hash-encoded financial data) from leaking
            // to third-party origins (AdSense, gtag) via Referer header.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
