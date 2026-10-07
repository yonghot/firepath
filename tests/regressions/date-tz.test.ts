// Date/timezone hydration guard (React #418: server renders in UTC, visitors do not). Template from
// D:\ClaudeCode\AppFarm\scripts\templates. Copy to tests/regressions/date-tz.test.ts and edit ONLY the CONFIG block.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerBlock } from "@/components/common/answer-block";
import { AuthorByline } from "@/components/common/author-byline";
import { UpdatedBadge } from "@/components/common/updated-badge";
import { ResultDisclaimer } from "@/components/compliance/ResultDisclaimer";
import { formatIsoDate } from "@/lib/utils/format";
import type { GeoAnswerEntity } from "@/lib/seo/geo";

const ISO_DATES = ["2026-01-01", "2026-06-29", "2026-12-31"];
const entity = (lastUpdated: string): GeoAnswerEntity => ({ query: "q", answer: "a", lastUpdated, tableHeaders: [], tableRows: [], factors: [], stats: [] });
const markup = (type: Parameters<typeof createElement>[0], props: (d: string) => object) =>
  ISO_DATES.map((d) => renderToStaticMarkup(createElement(type, props(d)))).join("|");

const CONFIG = {
  repoRoot: path.resolve(__dirname, "..", ".."),
  sourceDirs: ["src"],
  // Repo-relative paths allowed to format without timeZone, each with the reason (e.g. build-time-only scripts).
  allow: {
    "src/components/common/recent-calculations.tsx": "shows the viewer's own stored timestamps in local time; renders only after mount (state starts empty, filled in an effect)",
    "src/components/features/saved/saved-item.tsx": "shows the signed-in viewer's own save date in local time; rendered only from fetched query data, never in the server HTML",
    "src/components/features/calculator/save-calculation-button.tsx": "default save name uses the viewer's local date; evaluated in the click handler, never during render",
  } as Record<string, string>,
  // Display formatters fed a fixed instant; each must produce identical text in UTC and America/Los_Angeles.
  renderers: [
    { name: "formatIsoDate", render: () => ISO_DATES.map(formatIsoDate).join("|") },
    { name: "ResultDisclaimer", render: () => markup(ResultDisclaimer, (d) => ({ lastUpdated: d })) },
    { name: "AnswerBlock", render: () => markup(AnswerBlock, (d) => ({ entity: entity(d) })) },
    { name: "AuthorByline", render: () => markup(AuthorByline, (d) => ({ lastUpdated: d })) },
    { name: "UpdatedBadge", render: () => markup(UpdatedBadge, (d) => ({ lastUpdated: d })) },
  ] as Array<{ name: string; render: () => string }>,
};

type Hit = { file: string; line: number; text: string; rule: string };

const CALL = /(\.toLocale(?:Date|Time)?String|Intl\.DateTimeFormat)\s*\(/g;
const WALL_YEAR = /new Date\(\)\s*\.\s*get(?:UTC)?FullYear\(\)/g;

function callArgs(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "(") depth += 1;
    else if (src[i] === ")" && (depth -= 1) === 0) return src.slice(open + 1, i);
  }
  return src.slice(open + 1);
}

function scanSource(file: string, src: string): Hit[] {
  const hits: Hit[] = [];
  const lineOf = (i: number) => src.slice(0, i).split("\n").length;
  for (const m of src.matchAll(CALL)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const args = callArgs(src, open);
    // .toLocaleString is shared with Number; only treat it as a date format when it carries date/time options.
    if (m[1] === ".toLocaleString" && !/\b(year|month|day|weekday|hour|minute|second|dateStyle|timeStyle|timeZoneName)\s*:/.test(args)) continue;
    if (!/\btimeZone\s*:/.test(args)) hits.push({ file, line: lineOf(m.index ?? 0), text: m[0] + args.slice(0, 80) + ")", rule: "format-without-timeZone" });
    else if (!/^\s*["'`][a-z]{2}(?:-[A-Z]{2})?["'`]/.test(args) && m[1] !== "Intl.DateTimeFormat") hits.push({ file, line: lineOf(m.index ?? 0), text: m[0] + args.slice(0, 80) + ")", rule: "format-without-locale" });
  }
  if (/\.(t|j)sx$/.test(file)) {
    for (const m of src.matchAll(WALL_YEAR)) hits.push({ file, line: lineOf(m.index ?? 0), text: m[0], rule: "wall-clock-year-in-rendered-code" });
  }
  return hits;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(entry.name) && !/\.test\.|\.spec\.|__tests__/.test(p)) out.push(p);
  }
  return out;
}

describe("date/timezone hydration guard", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("every displayed date format names a timeZone and a locale; no wall-clock year in rendered code", () => {
    const files = [...new Set(CONFIG.sourceDirs.flatMap((d) => walk(path.join(CONFIG.repoRoot, d))))];
    const hits = files
      .flatMap((f) => scanSource(path.relative(CONFIG.repoRoot, f).replace(/\\/g, "/"), readFileSync(f, "utf8")))
      .filter((h) => !(h.file in CONFIG.allow));
    expect(hits).toEqual([]);
  });

  it.each(CONFIG.renderers.length ? CONFIG.renderers : [{ name: "(add display formatters to CONFIG.renderers)", render: () => "" }])(
    "$name renders identical text in UTC and America/Los_Angeles",
    ({ render }) => {
      process.env.TZ = "UTC";
      const utc = render();
      process.env.TZ = "America/Los_Angeles";
      const la = render();
      expect(la).toBe(utc);
    },
  );

  it("positive control: the scanner flags the known-bad shapes and passes the fixed ones", () => {
    const rules = (src: string, file = "components/x.tsx") => scanSource(file, src).map((h) => h.rule);
    expect(rules('d.toLocaleDateString("en-US", { month: "short", day: "numeric" })')).toEqual(["format-without-timeZone"]);
    expect(rules('new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d)')).toEqual(["format-without-timeZone"]);
    expect(rules("d.toLocaleDateString(undefined, { timeZone: \"UTC\" })")).toEqual(["format-without-locale"]);
    expect(rules('{new Date().getFullYear() + 1}')).toEqual(["wall-clock-year-in-rendered-code"]);
    expect(rules('d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })')).toEqual([]);
    expect(rules('new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })')).toEqual([]);
    expect(rules("const y = new Date().getFullYear();", "lib/build-only.ts")).toEqual([]);
    expect(rules('amount.toLocaleString("en-US", { maximumFractionDigits: 0 })')).toEqual([]);
    expect(rules('d.toLocaleString("en-US", { month: "short" })')).toEqual(["format-without-timeZone"]);
  });

  it("positive control: a formatter without timeZone really differs between the two zones", () => {
    const instant = new Date("2026-01-01T03:00:00Z");
    const bad = () => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(instant);
    process.env.TZ = "UTC";
    const utc = bad();
    process.env.TZ = "America/Los_Angeles";
    expect(bad()).not.toBe(utc);
  });
});
