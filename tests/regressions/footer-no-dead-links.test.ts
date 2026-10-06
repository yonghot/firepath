import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '@/components/layouts/footer';
import FireTypesPage from '@/app/(main)/fire-types/page';
import { hasStaticRoute } from './helpers/app-routes';

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
}

describe('footer links never point at pages that do not exist', () => {
  const footerHtml = renderToStaticMarkup(createElement(Footer));

  it('does not link the database-authored guide slugs that 404 in production', () => {
    expect(footerHtml).not.toContain('/guide/what-is-');
  });

  it('links the FIRE type sections of /fire-types', () => {
    for (const type of ['coast', 'lean', 'fat']) {
      expect(footerHtml).toContain(`href="/fire-types#${type}"`);
    }
  });

  it('every footer link resolves to an existing route', () => {
    const links = hrefs(footerHtml);
    expect(links.length).toBeGreaterThan(8);
    expect(links.filter((href) => !hasStaticRoute(href))).toEqual([]);
  });

  it('every footer fragment exists as an id on its target page', () => {
    const fireTypesHtml = renderToStaticMarkup(createElement(FireTypesPage));
    const fragments = hrefs(footerHtml)
      .filter((href) => href.startsWith('/fire-types#'))
      .map((href) => href.split('#')[1]);
    expect(fragments).toEqual(['coast', 'lean', 'fat']);
    for (const id of fragments) {
      expect(fireTypesHtml).toContain(`id="${id}"`);
    }
  });

  it('FIRE type cards leave room for the sticky header when jumped to', () => {
    const fireTypesHtml = renderToStaticMarkup(createElement(FireTypesPage));
    const cards = fireTypesHtml.match(/<article id="[a-z]+" class="[^"]*"/g) ?? [];
    expect(cards).toHaveLength(5);
    for (const card of cards) expect(card).toContain('scroll-mt-20');
  });
});
