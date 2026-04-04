# FIREPath — Code Review Log

## Review 2026-04-05 — Code Review + Security Audit

### Code Review (Architecture)
**Scope**: Full codebase structural audit

| # | Severity | File | Issue | Resolution |
|---|----------|------|-------|------------|
| 1 | 🔴 | guide/[slug]/page.tsx:43-66 | XSS via dangerouslySetInnerHTML — no HTML escaping | FIXED: Added `esc()` function to sanitize all content |
| 2 | 🔴 | api/calculations/route.ts:74 | `request.json()` throws on malformed JSON → 500 | FIXED: Wrapped in try/catch → 400 |
| 3 | 🟡 | api/calculations/route.ts:38-39 | NaN pagination from non-numeric params | FIXED: parseInt + isNaN fallback |
| 4 | 🟡 | api/calculations/route.ts:78 | Zod error leaks schema details | FIXED: Sanitized error message |
| 5 | 🟡 | services/calculation.service.ts:15-17 | 2 sequential queries could be parallel | Accepted (low traffic prototype) |
| 6 | 🟡 | hooks/use-url-state.ts:12-31 | URL hash race in strict mode | Accepted (mitigated by initialized ref) |
| 7 | 🟢 | types/api.types.ts:27-28 | Loose typing (Record<string, unknown>) | Deferred |

### Security Audit (OWASP Top 10 + STRIDE)
**Scope**: Full codebase security analysis

| # | Category | Severity | Status |
|---|----------|----------|--------|
| 1 | SQL Injection (A03) | — | PASS — Supabase parameterized queries |
| 2 | Broken Auth (A07) | — | PASS — All API routes check auth |
| 3 | Sensitive Data (A02) | 🟡 | Hardcoded seed credentials — marked [PROD-TODO] |
| 4 | RLS Bypass | 🟡 | createServiceClient exported — added JSDoc warning |
| 5 | XSS (A03) | 🔴 | FIXED — HTML escaping added to guide renderer |
| 6 | CSRF | — | PASS — SameSite cookies + JSON content type |
| 7 | Client Secrets | — | PASS — No secrets in client bundles |

### Design Audit
**Scope**: DESIGN.md compliance check

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | 🟢 | Tooltip border-radius inconsistency | FIXED: rounded-lg → rounded-md |
| 2 | — | FIRE colors consistent | PASS (95% compliance) |
| 3 | — | CSS variables correct | PASS |
| 4 | — | Spacing scale consistent | PASS |
