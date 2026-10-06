import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '@/components/layouts/header';
import MainLayout from '@/app/(main)/layout';
import { SiteChrome } from '@/components/layouts/site-chrome';
import { ERROR_CODES } from '@/constants/error-codes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const SRC = join(__dirname, '..', '..', 'src');
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

function configureAuth(on: boolean) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', on ? 'https://example.supabase.test' : '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', on ? 'test-anon-key' : '');
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

afterEach(() => vi.unstubAllEnvs());

describe('K10: no Sign In entry point where signing in cannot work', () => {
  it('the header renders no Sign In link (desktop or sheet) when auth is unavailable', () => {
    configureAuth(false);
    const html = renderToStaticMarkup(createElement(Header, { authAvailable: false }));
    expect(html).not.toContain('Sign In');
    expect(html).not.toContain('href="/login"');
  });

  it('the header shows Sign In when the page says auth is available and the visitor is signed out', () => {
    configureAuth(false);
    const html = renderToStaticMarkup(createElement(Header, { authAvailable: true }));
    expect(html).toContain('Sign In');
    expect(html).toContain('href="/login"');
  });

  it('the main layout derives availability from the Supabase env', () => {
    configureAuth(false);
    const page = createElement('p', null, 'content');
    const withoutAuth = renderToStaticMarkup(MainLayout({ children: page }) as React.ReactElement);
    expect(withoutAuth).not.toContain('Sign In');
    expect(withoutAuth).not.toContain('href="/login"');
  });

  it('the shared chrome passes authAvailable true when Supabase is configured', () => {
    configureAuth(true);
    const layout = SiteChrome({ children: null }) as React.ReactElement<{ children: React.ReactElement<{ authAvailable?: boolean }>[] }>;
    const header = (Array.isArray(layout.props.children) ? layout.props.children : [layout.props.children])[0];
    expect(header.props.authAvailable).toBe(true);
  });
});

describe('user-facing auth and API messages are English', () => {
  it('no error-code message contains Hangul', () => {
    for (const [name, entry] of Object.entries(ERROR_CODES)) expect(entry.message, name).not.toMatch(HANGUL);
  });

  it('no shipped string literal in the auth pages, error codes or API routes contains Hangul', () => {
    const files = [join(SRC, 'app', '(auth)'), join(SRC, 'app', 'api'), join(SRC, 'constants')].flatMap(sources);
    expect(files.length).toBeGreaterThan(5);
    const offenders = files
      .filter((file) => HANGUL.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });
});
