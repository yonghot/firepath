/**
 * monetization.ts — unit tests
 *
 * Tests:
 *   1. parseFeaturedPartners — valid JSON, malformed JSON, empty/missing, wrong shape
 *   2. resolveAdProvider    — default (adsense), all valid values, unknown, empty
 *   3. resolvePrimaryCtaType — default (cpl), all valid values, unknown, empty
 *   4. buildMonetizationConfig — all env unset → all nulls/defaults/empty arrays
 *   5. buildMonetizationConfig — provider selection returns exactly one active provider
 *   6. Email capture gate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseFeaturedPartners,
  resolveAdProvider,
  resolvePrimaryCtaType,
  buildMonetizationConfig,
  VERTICAL_DEFAULT_CTA_TYPE,
} from '@/lib/monetization';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

// ─── parseFeaturedPartners ────────────────────────────────────────────────────

describe('parseFeaturedPartners', () => {
  it('returns [] when undefined', () => {
    expect(parseFeaturedPartners(undefined)).toEqual([]);
  });

  it('returns [] when empty string', () => {
    expect(parseFeaturedPartners('')).toEqual([]);
  });

  it('returns [] when whitespace only', () => {
    expect(parseFeaturedPartners('   ')).toEqual([]);
  });

  it('returns [] on invalid JSON', () => {
    expect(parseFeaturedPartners('{not json')).toEqual([]);
  });

  it('returns [] when JSON is a non-array object', () => {
    expect(parseFeaturedPartners('{"label":"x"}')).toEqual([]);
  });

  it('returns [] on empty JSON array', () => {
    expect(parseFeaturedPartners('[]')).toEqual([]);
  });

  it('parses a single valid partner', () => {
    const raw = JSON.stringify([{ label: 'Acme', figure: '0.25% AUM', href: 'https://acme.example.com' }]);
    const result = parseFeaturedPartners(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Acme', figure: '0.25% AUM', href: 'https://acme.example.com' });
  });

  it('parses multiple valid partners', () => {
    const partners = [
      { label: 'A', figure: '1%', href: 'https://a.com' },
      { label: 'B', figure: '2%', href: 'https://b.com' },
      { label: 'C', figure: '3%', href: 'https://c.com' },
    ];
    const result = parseFeaturedPartners(JSON.stringify(partners));
    expect(result).toHaveLength(3);
    expect(result[2].label).toBe('C');
  });

  it('skips items with missing required fields', () => {
    const raw = JSON.stringify([
      { label: 'Valid', figure: '1%', href: 'https://v.com' },
      { label: 'NoHref', figure: '1%' },
      { figure: '1%', href: 'https://x.com' },
      null,
      42,
    ]);
    const result = parseFeaturedPartners(raw);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Valid');
  });

  it('skips items with empty string fields', () => {
    const raw = JSON.stringify([
      { label: '', figure: '1%', href: 'https://x.com' },
      { label: 'OK', figure: '', href: 'https://x.com' },
      { label: 'OK', figure: '1%', href: '' },
    ]);
    expect(parseFeaturedPartners(raw)).toEqual([]);
  });

  it('trims whitespace from fields', () => {
    const raw = JSON.stringify([{ label: '  Trimmed  ', figure: ' 0.1% ', href: ' https://t.com ' }]);
    const result = parseFeaturedPartners(raw);
    expect(result[0]).toEqual({ label: 'Trimmed', figure: '0.1%', href: 'https://t.com' });
  });
});

// ─── resolveAdProvider ────────────────────────────────────────────────────────

describe('resolveAdProvider', () => {
  it('returns adsense when undefined (default)', () => {
    expect(resolveAdProvider(undefined)).toBe('adsense');
  });

  it('returns adsense when empty string', () => {
    expect(resolveAdProvider('')).toBe('adsense');
  });

  it('returns adsense for explicit "adsense"', () => {
    expect(resolveAdProvider('adsense')).toBe('adsense');
  });

  it('returns ezoic', () => {
    expect(resolveAdProvider('ezoic')).toBe('ezoic');
  });

  it('returns raptive', () => {
    expect(resolveAdProvider('raptive')).toBe('raptive');
  });

  it('returns none', () => {
    expect(resolveAdProvider('none')).toBe('none');
  });

  it('is case-insensitive', () => {
    expect(resolveAdProvider('ADSENSE')).toBe('adsense');
    expect(resolveAdProvider('Ezoic')).toBe('ezoic');
    expect(resolveAdProvider('RAPTIVE')).toBe('raptive');
    expect(resolveAdProvider('None')).toBe('none');
  });

  it('returns none for unknown value', () => {
    expect(resolveAdProvider('mediavine')).toBe('none');
    expect(resolveAdProvider('random')).toBe('none');
  });

  it('NEVER returns two providers simultaneously', () => {
    const providers = ['adsense', 'ezoic', 'raptive', 'none', undefined, ''];
    for (const p of providers) {
      const resolved = resolveAdProvider(p);
      // resolved is a single discriminant — the test asserts it is exactly one
      // of the valid values (not a set or array)
      expect(['adsense', 'ezoic', 'raptive', 'none']).toContain(resolved);
    }
  });
});

// ─── resolvePrimaryCtaType ────────────────────────────────────────────────────

describe('resolvePrimaryCtaType', () => {
  it('returns VERTICAL_DEFAULT_CTA_TYPE when undefined', () => {
    expect(resolvePrimaryCtaType(undefined)).toBe(VERTICAL_DEFAULT_CTA_TYPE);
    expect(VERTICAL_DEFAULT_CTA_TYPE).toBe('cpl');
  });

  it('returns the default when empty', () => {
    expect(resolvePrimaryCtaType('')).toBe(VERTICAL_DEFAULT_CTA_TYPE);
  });

  it('returns call', () => {
    expect(resolvePrimaryCtaType('call')).toBe('call');
  });

  it('returns cpl', () => {
    expect(resolvePrimaryCtaType('cpl')).toBe('cpl');
  });

  it('returns affiliate', () => {
    expect(resolvePrimaryCtaType('affiliate')).toBe('affiliate');
  });

  it('returns none', () => {
    expect(resolvePrimaryCtaType('none')).toBe('none');
  });

  it('is case-insensitive', () => {
    expect(resolvePrimaryCtaType('CPL')).toBe('cpl');
    expect(resolvePrimaryCtaType('Call')).toBe('call');
  });

  it('falls back to default for unknown value', () => {
    expect(resolvePrimaryCtaType('unknown')).toBe(VERTICAL_DEFAULT_CTA_TYPE);
  });
});

// ─── buildMonetizationConfig — all env unset → nulls / defaults ──────────────

describe('buildMonetizationConfig — all env unset', () => {
  beforeEach(() => {
    // Clear all relevant env vars
    const keys = [
      'NEXT_PUBLIC_AD_PROVIDER',
      'NEXT_PUBLIC_ADSENSE_CLIENT_ID',
      'NEXT_PUBLIC_EZOIC_ENABLED',
      'NEXT_PUBLIC_RAPTIVE_SITE_ID',
      'NEXT_PUBLIC_ADSTXT_REDIRECT_URL',
      'NEXT_PUBLIC_PRIMARY_CTA_TYPE',
      'NEXT_PUBLIC_PPC_NUMBER',
      'NEXT_PUBLIC_PPC_LABEL',
      'NEXT_PUBLIC_CPL_URL',
      'NEXT_PUBLIC_CPL_LABEL',
      'MON_FEATURED_PARTNERS',
      'NEXT_PUBLIC_SPONSOR_HTML',
      'NEXT_PUBLIC_SPONSOR_BACKFILL_URL',
      'NEXT_PUBLIC_EMAIL_CAPTURE',
    ];
    for (const k of keys) delete process.env[k];
  });

  it('adProvider defaults to adsense when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.adProvider).toBe('adsense');
  });

  it('adsenseClientId is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.adsenseClientId).toBeNull();
  });

  it('ezoicEnabled is false when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.ezoicEnabled).toBe(false);
  });

  it('raptiveSiteId is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.raptiveSiteId).toBeNull();
  });

  it('adsTxtRedirectUrl is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.adsTxtRedirectUrl).toBeNull();
  });

  it('primaryCtaType defaults to vertical default (cpl) when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.primaryCtaType).toBe('cpl');
  });

  it('ppcNumber is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.ppcNumber).toBeNull();
  });

  it('ppcLabel is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.ppcLabel).toBeNull();
  });

  it('cplUrl is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.cplUrl).toBeNull();
  });

  it('cplLabel is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.cplLabel).toBeNull();
  });

  it('featuredPartners is [] when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.featuredPartners).toEqual([]);
  });

  it('sponsorHtml is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.sponsorHtml).toBeNull();
  });

  it('sponsorBackfillUrl is null when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.sponsorBackfillUrl).toBeNull();
  });

  it('emailCaptureEnabled is false when unset', () => {
    const cfg = buildMonetizationConfig();
    expect(cfg.emailCaptureEnabled).toBe(false);
  });
});

// ─── buildMonetizationConfig — with env set ───────────────────────────────────

describe('buildMonetizationConfig — with env vars set', () => {
  it('normalises adsense client id (adds ca- prefix when missing)', () => {
    withEnv({ NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'pub-1234567890123456' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.adsenseClientId).toBe('ca-pub-1234567890123456');
    });
  });

  it('keeps ca- prefix when already present', () => {
    withEnv({ NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-1234567890123456' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.adsenseClientId).toBe('ca-pub-1234567890123456');
    });
  });

  it('ezoicEnabled true when set to "true"', () => {
    withEnv({ NEXT_PUBLIC_EZOIC_ENABLED: 'true' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.ezoicEnabled).toBe(true);
    });
  });

  it('emailCaptureEnabled true when set to "on"', () => {
    withEnv({ NEXT_PUBLIC_EMAIL_CAPTURE: 'on' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.emailCaptureEnabled).toBe(true);
    });
  });

  it('emailCaptureEnabled false when set to "off"', () => {
    withEnv({ NEXT_PUBLIC_EMAIL_CAPTURE: 'off' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.emailCaptureEnabled).toBe(false);
    });
  });

  it('parses featured partners from env', () => {
    const partners = [{ label: 'X', figure: '1%', href: 'https://x.com' }];
    withEnv({ MON_FEATURED_PARTNERS: JSON.stringify(partners) }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.featuredPartners).toHaveLength(1);
      expect(cfg.featuredPartners[0].label).toBe('X');
    });
  });

  it('featuredPartners is [] on invalid JSON env', () => {
    withEnv({ MON_FEATURED_PARTNERS: 'not json at all' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.featuredPartners).toEqual([]);
    });
  });

  it('resolves raptive provider', () => {
    withEnv({ NEXT_PUBLIC_AD_PROVIDER: 'raptive', NEXT_PUBLIC_RAPTIVE_SITE_ID: 'my-site' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.adProvider).toBe('raptive');
      expect(cfg.raptiveSiteId).toBe('my-site');
    });
  });

  it('provider selection is exactly one — adsense + ezoic both set, provider=ezoic => only ezoic', () => {
    withEnv(
      {
        NEXT_PUBLIC_AD_PROVIDER: 'ezoic',
        NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-9999999999999999',
        NEXT_PUBLIC_EZOIC_ENABLED: 'true',
      },
      () => {
        const cfg = buildMonetizationConfig();
        // Exactly one provider resolves
        expect(cfg.adProvider).toBe('ezoic');
        // The adsense client id is still read (for potential ads.txt use) but
        // the resolved provider is unambiguously 'ezoic'
        expect(cfg.adProvider).not.toBe('adsense');
        expect(cfg.adProvider).not.toBe('raptive');
      }
    );
  });

  it('adsTxtRedirectUrl is set when env present', () => {
    withEnv({ NEXT_PUBLIC_ADSTXT_REDIRECT_URL: 'https://srv.adstxtmanager.com/1/site.com' }, () => {
      const cfg = buildMonetizationConfig();
      expect(cfg.adsTxtRedirectUrl).toBe('https://srv.adstxtmanager.com/1/site.com');
    });
  });

  it('cpl fields are read from env', () => {
    withEnv(
      {
        NEXT_PUBLIC_PRIMARY_CTA_TYPE: 'cpl',
        NEXT_PUBLIC_CPL_URL: 'https://partner.example.com/match',
        NEXT_PUBLIC_CPL_LABEL: 'Find an advisor',
      },
      () => {
        const cfg = buildMonetizationConfig();
        expect(cfg.primaryCtaType).toBe('cpl');
        expect(cfg.cplUrl).toBe('https://partner.example.com/match');
        expect(cfg.cplLabel).toBe('Find an advisor');
      }
    );
  });
});
