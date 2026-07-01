# FIREPath — Project Instructions

## Identity
FIREPath: 5가지 FIRE 유형(Lean/Regular/Fat/Coast/Barista)을 하나의 인터랙티브 타임라인으로 비교하는 무료 계산기 PWA.

## Stack
- Next.js 14+ (App Router, TypeScript strict)
- Supabase (PostgreSQL + Auth + RLS)
- shadcn/ui + Tailwind CSS
- Recharts, Zustand, TanStack Query, React Hook Form + Zod
- Vercel deploy, pnpm

## Architecture Rules
- FIRE 계산은 100% 클라이언트 사이드 (순수 함수, 서버 호출 없음)
- 서버는 인증 + 저장 + 구독 관리만 담당
- 3-Layer: API Route → Service → Repository (직접 DB 접근 금지)
- Service에서 Supabase 직접 호출 금지 — Repository만 호출
- 컴포넌트에 비즈니스 로직 금지 — hooks/stores/services로 분리

## API Response Format
```typescript
// Success: { success: true, data: T }
// Error: { success: false, error: { code: string, message: string } }
```

## FIRE Types & Colors
- Lean (#10B981) — 지출의 60%
- Regular (#2563EB) — 지출의 100%
- Fat (#7C3AED) — 지출의 150%
- Coast (#F59E0B) — 복리 성장으로 은퇴 목표 도달
- Barista (#EC4899) — Regular의 50% (파트타임 보전)

## File Organization
```
src/app/          — Pages (App Router)
src/components/   — UI components (no business logic)
  ui/             — shadcn/ui primitives
  layouts/        — Header, Footer, MobileNav
  features/       — Feature-specific components
  common/         — Shared components
src/lib/
  supabase/       — Supabase clients
  services/       — Business logic layer
  repositories/   — Data access layer
  engine/         — FIRE calculator (client-only)
  utils/          — Format, constants
src/hooks/        — Custom React hooks
src/stores/       — Zustand stores
src/types/        — TypeScript types
src/constants/    — App constants
```

## Coding Standards
- Use absolute imports with @/* alias
- Prefer Server Components; mark 'use client' only when needed
- All API routes use try-catch with consistent error response format
- Zod for all input validation (API + forms)
- React Query for server state, Zustand for client state
- Name files in kebab-case, types in PascalCase

## P0 Features (Must Have)
1. FIRE 계산 엔진 (5가지 유형 동시 계산)
2. 인터랙티브 슬라이더 패널 (9개 파라미터)
3. 실시간 타임라인 차트 (Recharts)
4. FIRE 결과 카드 5개
5. URL 해시 기반 공유
6. 모바일 반응형 레이아웃

## P1 Features
7. 이메일/OAuth 인증
8. 계산 저장/불러오기 (무료 5개 제한)
9. OG 이미지 동적 생성
10. SEO 가이드 콘텐츠 (SSG)
11. 시나리오 비교 (What-If)

## P2 Features
12. Stripe 프리미엄 구독 ($4.99/월)
13. 몬테카를로 시뮬레이션
14. 포트폴리오 최적화

## Admin Seed (Dev Only)
- admin@admin.com / admin123! [PROD-TODO: 변경 필수]

## Architecture Rules (Repeated for Emphasis)
- 3-Layer 위반 금지: API Route → Service → Repository
- 컴포넌트에 fetch/supabase 호출 금지
- Service에서 Supabase 직접 호출 금지

## Design System (imported)
디자인 하네스 — 모든 UI 변경은 아래 문서를 게이트로 준수한다 (`design/tokens.css`는 CSS 토큰 정본):
@./.impeccable.md
@./design/principles.md
@./design/required.md
@./design/forbidden.md
@./design/tone.md

## Plan Contract
모든 비자명(non-trivial) 작업은 착수 전 아래 6개 섹션을 채운 Plan Contract를 제시하고 합의한다. 사소한 1줄 수정은 면제.
1. **Goal / Scope** — 무엇을, 왜. 완료의 정의(DoD)를 1–2줄로.
2. **Constraints** — [MUST]/[MUST NOT]. 기존 파일 보존, 3-Layer 준수, 디자인 하네스(`design/*`) 준수, FIRE 색상 불변.
3. **Affected Surface** — 변경/생성 파일 목록과 영향 범위(컴포넌트·API·DB·토큰).
4. **Verification Plan** — `pnpm test`(vitest) + `pnpm lint` + `npx tsc --noEmit` + `npx impeccable detect src/`; UI는 시각 검증/스크린샷.
5. **Rollback** — 되돌리는 방법(커밋 단위, revert 지점). 비가역 작업(DB 마이그레이션 등)은 사전 백업·분기.
6. **Out of Scope / Risks** — 명시적 제외 항목과 위험·미해결 가정.

## Execution Defaults
> - 기본 실행 경로: Teleport back to terminal → Implement here
> - 클라우드 실행 허용: 순수 frontend 변경 + 공개 라이브러리 의존성만
> - Commit 정책: Ultraplan 실행 전 반드시 commit & push
> - Windows 주의: Bug #43576 감지 시 Cancel & save로 우회

## Workflow Defaults
- **Two-pass 패턴**: 첫 아키텍처 변경·신기능은 로컬에서 1차 구현/검증 → 안정화 후 Ultraplan으로 승격(2차)하여 전수 분석·계획을 적용한다.
- **Ultraplan 안전장치**: ultraplan/대규모 변경 실행 전 `git status` clean + `git push` 완료 보장.
- **품질 게이트**: 커밋 전 `.claude/hooks/pre-commit-gate.sh`(tsc + eslint + impeccable --fast)가 통과해야 한다.
- **서브에이전트**: `.claude/agents/*`(model: sonnet) — 분석/검토는 병렬 fan-out, 적대적 교차검증 후 통합.
