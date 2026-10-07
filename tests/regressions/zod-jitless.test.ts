import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { z as zV4 } from 'zod/v4';

const ROOT = join(__dirname, '..', '..');
const ROUTES = ['src/app/api/email-results/route.ts', 'src/app/api/calculations/route.ts'];

async function functionConstructions(run: () => unknown): Promise<number> {
  const Original = globalThis.Function;
  let calls = 0;
  globalThis.Function = new Proxy(Original, {
    construct(target, args) {
      calls += 1;
      return Reflect.construct(target, args);
    },
    apply(target, self, args) {
      calls += 1;
      return Reflect.apply(target, self, args);
    },
  });
  try {
    await run();
  } finally {
    globalThis.Function = Original;
  }
  return calls;
}

const defineAndParse = () => {
  const schema = z.object({ email: z.string(), age: z.number().int() });
  schema.safeParse({ email: 'a@b.co', age: 40 });
};

function zodImporters(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : zodImporters(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return /from\s+['"]zod(\/v4)?['"]/.test(readFileSync(full, 'utf8')) ? [relative(ROOT, full).replace(/\\/g, '/')] : [];
  });
}

// Order matters: the control must run before anything imports the config module.
describe('Zod v4 JIT is what builds code strings at runtime', () => {
  it('positive control: without the config, defining and parsing an object schema constructs functions from strings', async () => {
    expect(z.core.globalConfig.jitless).not.toBe(true);
    expect(await functionConstructions(defineAndParse)).toBeGreaterThan(0);
  });
});

describe('Zod jitless in the server routes (leader directive)', () => {
  // Runs after the positive control above; the cold route imports take seconds under a loaded full suite.
  beforeAll(async () => {
    await import('@/app/api/email-results/route');
    await import('@/app/api/calculations/route');
  });

  it('importing the two API routes sets jitless before their schemas are defined', async () => {
    expect(z.core.globalConfig.jitless).toBe(true);
    expect(zV4.core.globalConfig.jitless).toBe(true);
  });

  it('the shared module is what sets it, and both zod entry points see the same flag', async () => {
    await import('@/lib/zod-config');
    expect(z.core.globalConfig.jitless).toBe(true);
    expect(zV4.core.globalConfig).toBe(z.core.globalConfig);
  });

  it('after the import, defining and parsing a schema constructs no function from a string', async () => {
    expect(await functionConstructions(defineAndParse)).toBe(0);
  });

  it('the email-results route still validates, and handles requests without constructing functions', async () => {
    const { POST } = await import('@/app/api/email-results/route');
    const request = (body: unknown, ip: string) =>
      new Request('http://localhost/api/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify(body),
      });
    const valid = { email: 'user@example.com', calc_type: 'fire_timeline', share_url: 'https://gofirepath.com/result#a=35' };
    const statuses: number[] = [];
    const calls = await functionConstructions(async () => {
      statuses.push((await POST(request(valid, '203.0.113.11'))).status);
      statuses.push((await POST(request({ ...valid, email: 'not-an-email' }, '203.0.113.12'))).status);
    });
    expect(statuses).toEqual([200, 400]);
    expect(calls).toBe(0);
  });

  it('each schema-defining module imports the config first, before any zod import', () => {
    for (const rel of ROUTES) {
      const imports = [...readFileSync(join(ROOT, rel), 'utf8').matchAll(/^import\s[^\n]*$/gm)].map((m) => m[0].trim());
      expect(imports[0], rel).toBe("import '@/lib/zod-config';");
      expect(imports.findIndex((line) => /from 'zod(\/v4)?'/.test(line)), rel).toBeGreaterThan(0);
    }
  });

  it('only the two API routes import zod', () => {
    expect(zodImporters(join(ROOT, 'src')).filter((file) => file !== 'src/lib/zod-config.ts').sort()).toEqual([...ROUTES].sort());
  });
});
