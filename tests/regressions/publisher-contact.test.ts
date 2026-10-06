import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLISHER } from '@/lib/site';
import { renderPage } from './helpers/render-pages';

const SRC = join(__dirname, '..', '..', 'src');
const UNDELIVERABLE = '@gofirepath.com';

function shippedSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : shippedSources(path);
    return /\.(tsx?|json|mjs)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('K6: the only published contact address is the publisher slot', () => {
  it('names Actigence with its site and mailbox, and no invented facts', () => {
    expect(PUBLISHER).toMatchObject({
      name: 'Actigence',
      url: 'https://actigence.ai',
      email: 'contact@actigence.ai',
    });
    expect(Object.keys(PUBLISHER).sort()).toEqual(['correctionRequest', 'email', 'name', 'url']);
    expect(PUBLISHER.correctionRequest).toContain(PUBLISHER.email);
  });

  it('no shipped source (code, comments, data) mentions an address at the undeliverable domain', () => {
    const offenders = shippedSources(SRC).filter((file) => readFileSync(file, 'utf8').includes(UNDELIVERABLE));
    expect(offenders.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });

  for (const path of ['/terms', '/privacy', '/contact']) {
    it(`${path} renders the publisher mailbox and never the undeliverable one`, async () => {
      const html = await renderPage(path);
      expect(html).toContain(`mailto:${PUBLISHER.email}`);
      expect(html).not.toContain(UNDELIVERABLE);
    });
  }
});
