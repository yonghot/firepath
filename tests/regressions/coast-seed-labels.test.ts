import { describe, expect, it, vi } from 'vitest';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { formatCurrencyFull as money } from '@/lib/utils/format';
import { buildFireStatisticsDataset } from '@/lib/seo/statistics';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GET as getDataJson } from '@/app/data.json/route';
import { GET as getDataCsv } from '@/app/data.csv/route';
import { preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages(['/', '/fire-types', '/fire-statistics']);

const { coast, lean } = calculateFIRE(DEFAULT_INPUT).results;

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

const COAST_ROW_TAIL = `discounted seed ${money(coast.targetAmount)} ${money(coast.monthlyPassiveIncome)}/mo at retirement`;

describe('W1 (K4): the Coast seed never sits next to a bare "Target" or "Monthly" label', () => {
  it('the /fire-types Coast card names the seed, the retirement-time income and the coast-ready age', async () => {
    const html = await renderPage('/fire-types');
    const card = html.match(/<article id="coast"[\s\S]*?<\/article>/)?.[0];
    expect(card).toBeDefined();
    const text = visibleText(card!);
    expect(text).toContain(`Seed needed today ${money(coast.targetAmount)}`);
    expect(text).toContain(`Monthly at retirement ${money(coast.monthlyPassiveIncome)}/mo`);
    expect(text).toContain(`Coast-ready at age ${coast.reachAge}`);
    expect(text).not.toMatch(/\bTarget\b[^.]{0,40}\$263/);
  });

  it('the other /fire-types cards keep Target, Monthly and Reach Age', async () => {
    const html = await renderPage('/fire-types');
    const card = html.match(/<article id="lean"[\s\S]*?<\/article>/)?.[0];
    const text = visibleText(card!);
    expect(text).toContain(`Target ${money(lean.targetAmount)}`);
    expect(text).toContain(`Monthly ${money(lean.monthlyPassiveIncome)}/mo`);
    expect(text).toContain(`Reach Age ${lean.reachAge}`);
    expect(text).not.toMatch(/Seed needed today|Coast-ready/);
  });

  it('the answer-block tables on / and /fire-types label the Coast row as a seed and its income as at retirement', async () => {
    for (const [route, label] of [['/', 'Coast'], ['/fire-types', 'Coast FIRE']] as const) {
      const text = visibleText(await renderPage(route));
      expect(text, route).toContain(`${label} (seed needed today) ${COAST_ROW_TAIL}`);
    }
  });

  it('the ranked table on /fire-statistics does the same', async () => {
    const text = visibleText(await renderPage('/fire-statistics'));
    expect(text).toContain(`Coast FIRE (seed needed today) ${COAST_ROW_TAIL}`);
  });

  it('the retirement-age table on /fire-statistics heads the Coast column as a seed', async () => {
    const html = await renderPage('/fire-statistics');
    const headers = [...html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => decode(m[1]).trim());
    expect(headers).toContain('Coast (seed today)');
    expect(headers).not.toContain('Coast');
  });

  it('/data.json scenarios and every /data.csv Coast row say the amount is a seed', async () => {
    const body = await getDataJson().json();
    expect(body.scenarioTargetMeaning.coast).toMatch(/^Seed needed today/);
    expect(body.scenarioTargetMeaning.lean).toBe('Target amount');
    const rows = (await getDataCsv().text()).trim().split('\n').slice(1).map((line) => line.split(','));
    const coastRows = rows.filter((r) => r[1] === 'coast');
    expect(coastRows.length).toBeGreaterThan(0);
    for (const r of coastRows) expect(r[3]).toMatch(/^Seed needed today/);
  });

  it('the /fire-types OG card does not show the Coast seed under a bare type name', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'src', 'app', '(main)', 'fire-types', 'opengraph-image.tsx'), 'utf8');
    expect(src).toMatch(/label: 'Coast seed today', value: formatCurrencyFull\(results\.coast\.targetAmount\)/);
    expect(src).not.toMatch(/label: 'Coast FIRE'/);
  });

  it('/data.json says what the Coast amounts mean; the other rows say target amount', async () => {
    const body = await getDataJson().json();
    const dataset = buildFireStatisticsDataset();
    const rows = body.rankedFireTypes as Array<{ type: string; targetMeaning: string; monthlyMeaning: string }>;
    expect(rows).toHaveLength(dataset.rankedFireTypes.length);
    for (const row of rows) {
      if (row.type === 'coast') {
        expect(row.targetMeaning).toMatch(/^Seed needed today/);
        expect(row.monthlyMeaning).toMatch(/at retirement/);
      } else {
        expect(row.targetMeaning).toBe('Target amount');
        expect(row.monthlyMeaning).toBe('Monthly passive income at the target');
      }
    }
  });
});
