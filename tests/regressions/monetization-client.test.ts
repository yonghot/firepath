import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'next/dist/build/swc';
import { renderPage } from './helpers/render-pages';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PARTNERS = [
  { label: 'Alpha Brokerage', figure: '0.25% fee', href: 'https://example.com/alpha' },
  { label: 'Beta Robo', figure: '$0 minimum', href: 'https://example.com/beta' },
];
const PARTNERS_ENV = JSON.stringify(PARTNERS);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

const IMPORT_RE = /(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveImport(from: string, spec: string, files: Map<string, string>): string | null {
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

const isClientFile = (src: string) => /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(src);

function serverOnlyEnvReads(files: Map<string, string>): string[] {
  const reachable = new Set<string>();
  const queue = [...files].filter(([, src]) => isClientFile(src)).map(([file]) => file);
  while (queue.length) {
    const file = queue.pop() as string;
    if (reachable.has(file)) continue;
    reachable.add(file);
    for (const match of (files.get(file) as string).matchAll(IMPORT_RE)) {
      const target = resolveImport(file, match[1] ?? match[2] ?? match[3], files);
      if (target) queue.push(target);
    }
  }
  const offenders: string[] = [];
  for (const file of reachable) {
    const src = stripComments(files.get(file) as string);
    for (const match of src.matchAll(/process\.env(?:\.([A-Za-z0-9_]+)|\s*\[)/g)) {
      const name = match[1] ?? '[computed]';
      if (name.startsWith('NEXT_PUBLIC_') || name === 'NODE_ENV') continue;
      if (name === 'VERCEL_ENV' && file === join(SRC, 'lib', 'ads-env.ts')) continue;
      offenders.push(`${relative(ROOT, file).replace(/\\/g, '/')}: ${name}`);
    }
  }
  return offenders.sort();
}

const projectFiles = new Map(sourceFiles(SRC).map((file) => [file, readFileSync(file, 'utf8')]));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('K33(1): no server-only env read is reachable from a "use client" file', () => {
  it('positive control: the scanner flags a client file that reaches a server-only read through an import', () => {
    const client = join(SRC, 'a.tsx');
    const lib = join(SRC, 'b.ts');
    const other = join(SRC, 'c.ts');
    const flagged = serverOnlyEnvReads(
      new Map([
        [client, "'use client';\nimport { x } from '@/b';\nexport const y = x;"],
        [lib, 'export const x = process.env.MON_FEATURED_PARTNERS;'],
        [other, 'export const z = process.env.INDEXNOW_KEY;'],
      ]),
    );
    expect(flagged).toEqual(['src/b.ts: MON_FEATURED_PARTNERS']);
    expect(
      serverOnlyEnvReads(
        new Map([
          [client, "'use client';\nexport const y = process.env.NEXT_PUBLIC_A;"],
          [lib, 'export const x = process.env[name];'],
        ]),
      ),
    ).toEqual([]);
  });

  it('the scan covers the monetization client closure', () => {
    const resultMonetization = join(SRC, 'components', 'monetization', 'ResultMonetization.tsx');
    expect(isClientFile(projectFiles.get(resultMonetization) as string)).toBe(true);
    const imports = [...(projectFiles.get(resultMonetization) as string).matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3]);
    expect(imports).toContain('@/lib/monetization');
  });

  it('every file reachable from any client file reads only NEXT_PUBLIC_*, NODE_ENV or the mirrored VERCEL_ENV', () => {
    expect(serverOnlyEnvReads(projectFiles)).toEqual([]);
  });

  it('the one allowed VERCEL_ENV read is paired with its NEXT_PUBLIC mirror, which next.config.ts fills', () => {
    expect(stripComments(read('src/lib/ads-env.ts'))).toContain('process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV');
    expect(stripComments(read('next.config.ts'))).toMatch(/NEXT_PUBLIC_VERCEL_ENV:\s*process\.env\.VERCEL_ENV\s*\|\|/);
  });
});

describe('K33(1): browser-compiled monetization config equals the server config', () => {
  const BUILD_ENV: Record<string, string> = {
    NEXT_PUBLIC_AD_PROVIDER: 'adsense',
    NEXT_PUBLIC_PRIMARY_CTA_TYPE: 'affiliate',
    NEXT_PUBLIC_PPC_NUMBER: '+18005551234',
    NEXT_PUBLIC_PPC_LABEL: 'Test call label',
    NEXT_PUBLIC_CPL_URL: ' https://example.com/lead ',
    NEXT_PUBLIC_CPL_LABEL: 'Test lead label',
    NEXT_PUBLIC_SPONSOR_BACKFILL_URL: 'https://example.com/sponsor',
    NEXT_PUBLIC_EMAIL_CAPTURE: 'on',
    NEXT_PUBLIC_POSTAL_ADDRESS: 'Test postal address',
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-1234567890',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  };

  function compileForBrowser<T>(file: string, modules: Record<string, unknown> = {}): T {
    const { code } = transformSync(readFileSync(join(ROOT, file), 'utf8'), {
      filename: file,
      jsc: {
        parser: { syntax: 'typescript' },
        transform: {
          optimizer: {
            globals: { envs: Object.fromEntries(Object.entries(BUILD_ENV).map(([key, value]) => [key, JSON.stringify(value)])) },
          },
        },
      },
      module: { type: 'commonjs' },
    });
    const exports = {};
    runInNewContext(code, { exports, process: { env: {} }, require: (id: string) => modules[id] });
    return exports as T;
  }

  it('server-only env values never change what the browser computes, and the server computes the same config', async () => {
    const adsEnv = compileForBrowser<typeof import('@/lib/ads-env')>('src/lib/ads-env.ts');
    const browser = compileForBrowser<typeof import('@/lib/monetization')>('src/lib/monetization.ts', { '@/lib/ads-env': adsEnv });
    for (const [key, value] of Object.entries(BUILD_ENV)) vi.stubEnv(key, value);
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('MON_FEATURED_PARTNERS', PARTNERS_ENV);
    const server = await import('@/lib/monetization');

    const browserConfig = browser.buildMonetizationConfig();
    expect(browserConfig).toMatchObject({
      primaryCtaType: 'affiliate',
      ppcNumber: '+18005551234',
      cplUrl: 'https://example.com/lead',
      sponsorBackfillUrl: 'https://example.com/sponsor',
      emailCaptureEnabled: true,
      postalAddress: 'Test postal address',
      adsenseClientId: 'ca-pub-1234567890',
    });
    expect(browserConfig).toEqual(server.buildMonetizationConfig());
    expect(browserConfig).not.toHaveProperty('featuredPartners');
  });
});

describe('K33(1): ResultMonetization takes featured partners from its server parent', () => {
  async function load(env: Record<string, string | undefined> = {}) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return (await import('@/components/monetization/ResultMonetization')).ResultMonetization as (props: Record<string, unknown>) => ReactNode;
  }
  const html = (Component: (props: Record<string, unknown>) => ReactNode, props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(Component as never, { isPremium: true, ...props }));

  it('env unset and no prop: no partner table, no FTC disclosure, no sponsored link', async () => {
    const out = html(await load(), {});
    expect(out).not.toContain('Featured partners');
    expect(out).not.toContain('We may earn a commission');
    expect(out).not.toContain('sponsored');
  });

  it('partners passed as a prop render the table with the FTC disclosure above it and sponsored links', async () => {
    const out = html(await load(), { featuredPartners: PARTNERS });
    expect(out).toContain('Alpha Brokerage');
    expect(out).toContain('Beta Robo');
    const disclosure = out.indexOf('We may earn a commission');
    expect(disclosure).toBeGreaterThan(-1);
    expect(disclosure).toBeLessThan(out.indexOf('Featured partners'));
    expect(out.match(/rel="noopener noreferrer sponsored"/g)).toHaveLength(PARTNERS.length);
  });

  it('MON_FEATURED_PARTNERS in the environment is not read by the component', async () => {
    const Component = await load();
    vi.stubEnv('MON_FEATURED_PARTNERS', PARTNERS_ENV);
    const out = html(Component, {});
    expect(out).not.toContain('Alpha Brokerage');
    expect(out).not.toContain('Featured partners');
  });

  it('affiliate CTA uses the first partner prop with a disclosure, and renders nothing without partners', async () => {
    const Component = await load({ NEXT_PUBLIC_PRIMARY_CTA_TYPE: 'affiliate' });
    const withPartners = html(Component, { featuredPartners: PARTNERS });
    expect(withPartners).toContain('aria-label="Featured robo-advisor"');
    expect(withPartners).toContain('href="https://example.com/alpha"');
    expect(withPartners.match(/We may earn a commission/g)?.length).toBeGreaterThanOrEqual(2);
    const without = html(Component, {});
    expect(without).not.toContain('Featured robo-advisor');
    expect(without).not.toContain('We may earn a commission');
  });

  it('lead-form CTA always carries its FTC disclosure above the outbound link', async () => {
    const out = html(await load({ NEXT_PUBLIC_PRIMARY_CTA_TYPE: 'cpl', NEXT_PUBLIC_CPL_URL: 'https://example.com/lead' }), {});
    expect(out).toContain('href="https://example.com/lead"');
    expect(out.indexOf('We may earn a commission')).toBeGreaterThan(-1);
    expect(out.indexOf('We may earn a commission')).toBeLessThan(out.indexOf('href="https://example.com/lead"'));
  });

  it('call CTA carries its FTC disclosure above the tel link', async () => {
    const out = html(await load({ NEXT_PUBLIC_PRIMARY_CTA_TYPE: 'call', NEXT_PUBLIC_PPC_NUMBER: '+18005551234' }), {});
    expect(out).toContain('href="tel:+18005551234"');
    expect(out.indexOf('We may earn a commission')).toBeGreaterThan(-1);
    expect(out.indexOf('We may earn a commission')).toBeLessThan(out.indexOf('href="tel:+18005551234"'));
  });

  it('every page that mounts ResultMonetization is a server component that parses the env and passes the prop', () => {
    const mounts = [...projectFiles].filter(([, src]) => /<ResultMonetization\b/.test(stripComments(src)));
    expect(mounts.length).toBeGreaterThanOrEqual(2);
    for (const [file, src] of mounts) {
      const name = relative(ROOT, file).replace(/\\/g, '/');
      expect(isClientFile(src), name).toBe(false);
      expect(stripComments(src), name).toMatch(/featuredPartners=\{parseFeaturedPartners\(process\.env\.MON_FEATURED_PARTNERS\)\}/);
    }
  });

  it('the home page reads the env on the server: partners appear with the disclosure when set, nothing when unset', async () => {
    vi.stubEnv('MON_FEATURED_PARTNERS', PARTNERS_ENV);
    const withEnv = await renderPage('/');
    expect(withEnv).toContain('Alpha Brokerage');
    expect(withEnv).toContain('We may earn a commission');
    vi.stubEnv('MON_FEATURED_PARTNERS', undefined);
    const withoutEnv = await renderPage('/');
    expect(withoutEnv).not.toContain('Alpha Brokerage');
    expect(withoutEnv).not.toContain('We may earn a commission');
  });
});

describe('K25/K33(2): docs/ACTIVATION.md lists env names and the legal-review status, never values', () => {
  const doc = existsSync(join(ROOT, 'docs', 'ACTIVATION.md')) ? read('docs/ACTIVATION.md') : '';

  it('exists and names the server-only partner variable and the public slot variables', () => {
    expect(doc).toContain('MON_FEATURED_PARTNERS');
    for (const name of ['NEXT_PUBLIC_ADSENSE_SLOT_ID', 'NEXT_PUBLIC_CPL_URL', 'NEXT_PUBLIC_PRIMARY_CTA_TYPE', 'NEXT_PUBLIC_ADVISOR_CTA_URL', 'FEEDBACK_ENDPOINT']) {
      expect(doc, name).toContain(name);
    }
  });

  it('marks brokerage, robo-advisor, insurance, HELOC and lawyer-directory programs as legal review first', () => {
    for (const category of ['brokerage', 'robo-advisor', 'insurance', 'HELOC', 'lawyer']) {
      expect(doc.toLowerCase(), category).toContain(category.toLowerCase());
    }
    expect(doc).toMatch(/legal review first/i);
  });

  it('every env name it mentions exists in the source, and it carries no URLs, keys or phone numbers', () => {
    const sources = [...projectFiles.values()].join('\n') + read('next.config.ts') + read('scripts/indexnow.mjs');
    const names = [...new Set(doc.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])];
    expect(names.length).toBeGreaterThan(5);
    for (const name of names) expect(sources, name).toContain(name);
    expect(doc).not.toMatch(/https?:\/\/|\+\d{8,}|\bpub-\d+|sk_(live|test)|ca-pub/);
  });
});
