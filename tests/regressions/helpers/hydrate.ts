import { act, cloneElement, createElement, isValidElement, type ElementType, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { vi } from 'vitest';
import { populateGlobal } from 'vitest/environments';
import { Window } from 'happy-dom';

export interface BrowserState {
  now: Date;
  locale?: string;
  timeZone?: string;
  storage?: Record<string, string>;
  session?: Record<string, string>;
  url?: string;
  referrer?: string;
}

export interface HydrationReport {
  problems: string[];
  hydratedHtml: string;
}

type Component = (props: Record<string, unknown>) => ReactNode | Promise<ReactNode>;
type Modules = Record<string, Record<string, unknown>>;

export interface PageUnderTest {
  tree: ReactNode;
  serverComponents: Component[];
  /** Components declared inside a server file (not exported), matched by function name. */
  serverComponentNames?: string[];
}

const LOADERS = import.meta.glob(['/src/components/**/*.tsx', '/tests/regressions/helpers/fixtures/*.tsx']) as Record<string, () => Promise<Record<string, unknown>>>;
const SOURCES = import.meta.glob(['/src/components/**/*.tsx', '/tests/regressions/helpers/fixtures/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const hasClientDirective = (source: string) => /^['"]use client['"]/m.test(source.split(/^import /m)[0]);

async function loadComponents(): Promise<Modules> {
  const entries = await Promise.all(Object.entries(LOADERS).map(async ([path, load]) => [path, await load()] as const));
  return Object.fromEntries(entries);
}

const isExotic = (value: unknown) => typeof value === 'object' && value !== null && '$$typeof' in value;

function classify(modules: Modules, extraServer: Component[]) {
  const server = new Set<unknown>(extraServer);
  const clientRefs = new Map<unknown, readonly [string, string]>();
  for (const [path, mod] of Object.entries(modules)) {
    const client = hasClientDirective(SOURCES[path]);
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value !== 'function' && !isExotic(value)) continue;
      if (client) clientRefs.set(value, [path, name]);
      else if (typeof value === 'function') server.add(value);
    }
  }
  return { server, clientRefs };
}

async function mapTree(node: ReactNode, visit: (element: React.ReactElement) => Promise<ReactNode | null>): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map((child) => mapTree(child, visit)));
  if (!isValidElement(node)) return node;
  const replaced = await visit(node);
  if (replaced !== null) return mapTree(replaced, visit);
  const props = node.props as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key !== 'children' && (Array.isArray(value) || isValidElement(value))) next[key] = await mapTree(value as ReactNode, visit);
  }
  if (!('children' in props)) return cloneElement(node, next);
  const children = await mapTree(props.children as ReactNode, visit);
  return cloneElement(node, next, ...(Array.isArray(children) ? children : [children]));
}

/** Server components run once, on the server, in its locale and clock; the browser only re-renders the client components. */
function expandServerComponents(tree: ReactNode, server: Set<unknown>, names: string[]): Promise<ReactNode> {
  return mapTree(tree, async (element) =>
    typeof element.type === 'function' && (server.has(element.type) || names.includes(element.type.name)) ? await (element.type as Component)(element.props as Record<string, unknown>) : null,
  );
}

/** The browser loads its own copy of every client module, evaluated with its own locale, clock and globals. */
function swapToBrowserModules(tree: ReactNode, clientRefs: Map<unknown, readonly [string, string]>, fresh: Modules): Promise<ReactNode> {
  return mapTree(tree, async (element) => {
    const ref = clientRefs.get(element.type);
    if (!ref) return null;
    return createElement(fresh[ref[0]][ref[1]] as ElementType, element.key === null ? (element.props as object) : { ...(element.props as object), key: element.key });
  });
}

const REAL = {
  numberToLocaleString: Number.prototype.toLocaleString,
  dateToLocaleString: Date.prototype.toLocaleString,
  dateToLocaleDateString: Date.prototype.toLocaleDateString,
  dateToLocaleTimeString: Date.prototype.toLocaleTimeString,
  NumberFormat: Intl.NumberFormat,
  DateTimeFormat: Intl.DateTimeFormat,
};

function withDefaultLocale(locale: string): () => void {
  const orElse = (locales: unknown) => (locales === undefined ? locale : locales) as Intl.LocalesArgument;
  Number.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
    return REAL.numberToLocaleString.call(this, orElse(locales), options);
  };
  Date.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return REAL.dateToLocaleString.call(this, orElse(locales), options);
  };
  Date.prototype.toLocaleDateString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return REAL.dateToLocaleDateString.call(this, orElse(locales), options);
  };
  Date.prototype.toLocaleTimeString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return REAL.dateToLocaleTimeString.call(this, orElse(locales), options);
  };
  Intl.NumberFormat = new Proxy(REAL.NumberFormat, {
    construct: (target, args) => Reflect.construct(target, [orElse(args[0]), args[1]]),
    apply: (target, _this, args) => target(orElse(args[0]), args[1]),
  });
  Intl.DateTimeFormat = new Proxy(REAL.DateTimeFormat, {
    construct: (target, args) => Reflect.construct(target, [orElse(args[0]), args[1]]),
    apply: (target, _this, args) => target(orElse(args[0]), args[1]),
  });
  return () => {
    Number.prototype.toLocaleString = REAL.numberToLocaleString;
    Date.prototype.toLocaleString = REAL.dateToLocaleString;
    Date.prototype.toLocaleDateString = REAL.dateToLocaleDateString;
    Date.prototype.toLocaleTimeString = REAL.dateToLocaleTimeString;
    Intl.NumberFormat = REAL.NumberFormat;
    Intl.DateTimeFormat = REAL.DateTimeFormat;
  };
}

function setTimeZone(zone: string | undefined): () => void {
  const previous = process.env.TZ;
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
  return () => setTimeZone(previous);
}

function installBrowser(state: BrowserState) {
  const restoreZone = state.timeZone ? setTimeZone(state.timeZone) : () => {};
  const win = new Window({ url: state.url ?? 'https://gofirepath.com/' });
  for (const [k, v] of Object.entries(state.storage ?? {})) win.localStorage.setItem(k, v);
  for (const [k, v] of Object.entries(state.session ?? {})) win.sessionStorage.setItem(k, v);
  if (state.referrer) Object.defineProperty(win.document, 'referrer', { value: state.referrer });
  const populated = populateGlobal(globalThis, win, { bindFunctions: true });
  const restoreLocale = state.locale ? withDefaultLocale(state.locale) : () => {};
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(state.now);
  return {
    win,
    restore: () => {
      vi.useRealTimers();
      restoreLocale();
      restoreZone();
      for (const key of populated.keys) {
        delete (globalThis as Record<string, unknown>)[key];
        if (populated.originals.has(key)) (globalThis as Record<string, unknown>)[key] = populated.originals.get(key);
      }
      for (const key of ['window', 'self', 'top', 'parent']) delete (globalThis as Record<string, unknown>)[key];
    },
  };
}

/**
 * Server-renders the page, then hydrates that HTML in a browser model that has its own module registry,
 * locale, clock, storage and address bar. Any text or markup mismatch is returned in `problems`.
 */
export async function renderThenHydrate(
  build: () => Promise<PageUnderTest>,
  serverNow: Date,
  browser: BrowserState,
  serverTimeZone = 'UTC',
): Promise<HydrationReport> {
  if ('window' in globalThis) throw new Error('the server render must run without a browser window');

  vi.resetModules();
  const serverModules = await loadComponents();
  const page = await build();
  const { server, clientRefs } = classify(serverModules, page.serverComponents);
  const restoreServerZone = setTimeZone(serverTimeZone);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(serverNow);
  let html: string;
  let frozen: ReactNode;
  try {
    frozen = await expandServerComponents(page.tree, server, page.serverComponentNames ?? []);
    html = renderToString(frozen);
  } finally {
    vi.useRealTimers();
    restoreServerZone();
  }

  const { win, restore } = installBrowser(browser);
  const problems: string[] = [];
  const consoleError = console.error;
  console.error = (...args: unknown[]) => {
    problems.push(args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : String(a))).join(' '));
  };
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  try {
    vi.resetModules();
    const browserTree = await swapToBrowserModules(frozen, clientRefs, await loadComponents());
    const { hydrateRoot } = await import('react-dom/client');
    const container = win.document.createElement('div');
    container.innerHTML = html;
    win.document.body.appendChild(container);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container as unknown as Element, browserTree, {
        onRecoverableError: (error) => {
          problems.push(`recoverable: ${error instanceof Error ? error.message : String(error)}`);
        },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    const hydratedHtml = container.innerHTML;
    await act(async () => {
      root?.unmount();
    });
    return { problems, hydratedHtml };
  } finally {
    console.error = consoleError;
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
    restore();
  }
}
