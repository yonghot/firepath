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
