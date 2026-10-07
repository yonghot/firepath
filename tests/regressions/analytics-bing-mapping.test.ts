import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyReferral } from '@/lib/analytics';

const source = readFileSync(join(__dirname, '..', '..', 'src', 'lib', 'analytics.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const bingHostInEngineList = (src: string) =>
  /AI_ENGINE_HOSTS[\s\S]*?\];/.exec(src)?.[0].match(/['"](?:[a-z0-9-]+\.)*bing\.com['"]/g) ?? [];

describe('K34: a plain Bing referrer is never classified as AI traffic', () => {
  it.each([
    'https://www.bing.com/',
    'https://bing.com/',
    'https://www.bing.com/search?q=fire+calculator',
    'https://www.bing.com/chat',
    'https://cn.bing.com/',
    'https://www.bing.com.evil.example/',
  ])('%s -> none', (referrer) => {
    expect(classifyReferral(referrer, '')).toEqual({ kind: 'none' });
  });

  it('copilot.microsoft.com is classified as the copilot AI source', () => {
    expect(classifyReferral('https://copilot.microsoft.com/', '')).toEqual({ kind: 'ai_referral', source: 'copilot' });
  });

  it('the only Bing AI signal is the explicit utm_source path bing.com/search/ai, never the bare word bing', () => {
    expect(classifyReferral('', '?utm_source=bing.com/search/ai')).toMatchObject({ kind: 'ai_referral' });
    expect(classifyReferral('https://www.bing.com/', '?utm_source=bing')).toEqual({ kind: 'none' });
  });

  it('no Bing host appears in the AI engine host list, and copilot.microsoft.com does', () => {
    expect(bingHostInEngineList(source)).toEqual([]);
    expect(source).toContain("hosts: ['copilot.microsoft.com']");
  });

  it('positive control: the source guard flags a list that maps a bare Bing host', () => {
    const regressed = source.replace("hosts: ['copilot.microsoft.com']", "hosts: ['copilot.microsoft.com', 'bing.com']");
    expect(bingHostInEngineList(regressed)).toEqual(["'bing.com'"]);
  });
});
