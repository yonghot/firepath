import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '__tests__') sources(path, out);
    } else if (path.endsWith('.tsx') && !path.endsWith('.test.tsx')) out.push(path);
  }
  return out;
}

const INLINE_TAGS = new Set(['strong', 'em', 'a', 'span', 'b', 'i', 'code', 'Link', 'abbr', 'sup']);
const ENTITY = /&[a-zA-Z#0-9]+;/;

function glueSites(): string[] {
  const sites: string[] = [];
  for (const file of sources(SRC)) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        node.children.forEach((child, i) => {
          const prev = node.children[i - 1];
          if (i === 0 || !ts.isJsxText(child) || ts.isJsxText(prev)) return;
          const text = child.text;
          const where = () => `${relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(child.getStart()).line + 1}`;
          // The Next build drops the leading space of multi-line text that holds an HTML entity.
          if (/^[ \t]/.test(text) && text.includes('\n') && ENTITY.test(text)) sites.push(`${where()} leading space + entity`);
          // A newline-led text after an expression or inline element loses its separating whitespace.
          if (/^[ \t]*\r?\n/.test(text) && /^[A-Za-z0-9(“"']/.test(text.trim())) {
            const isSpacer = ts.isJsxExpression(prev) && prev.expression && ts.isStringLiteralLike(prev.expression) && prev.expression.text.trim() === '';
            const tag = ts.isJsxElement(prev) ? prev.openingElement.tagName.getText() : '';
            if (!isSpacer && (ts.isJsxExpression(prev) ? false : INLINE_TAGS.has(tag))) sites.push(`${where()} newline after <${tag}>`);
          }
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return sites;
}

describe('JSX text glue: a word never runs into the element or expression before it', () => {
  it('has no multi-line entity text or newline-led text that starts without an explicit space', () => {
    expect(glueSites()).toEqual([]);
  });

  it('detects the pre-fix shapes (positive control)', () => {
    const sf = ts.createSourceFile('x.tsx', 'const a = <p><b>x</b> is different: it\n  takes today&apos;s</p>;', ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let found = 0;
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node)) node.children.forEach((c, i) => { if (i && ts.isJsxText(c) && /^[ \t]/.test(c.text) && c.text.includes('\n') && ENTITY.test(c.text)) found++; });
      ts.forEachChild(node, visit);
    };
    visit(sf);
    expect(found).toBe(1);
  });
});
