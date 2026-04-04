# FIREPath — Product Requirements Document

## 2-1. Service Summary
- Name: FIREPath
- Tagline: "All FIRE types in one beautiful calculator"
- 5가지 FIRE 유형을 하나의 인터랙티브 타임라인으로 비교하는 무료 계산기 PWA

## 2-2. Target Users
| Persona | Age | Need |
|---------|-----|------|
| FIRE 추구자 | 25-45 | 유형별 달성 시점 비교 |
| FIRE 탐색자 | 22-35 | 쉬운 입력으로 가능 여부 확인 |
| 재무 블로거 | - | 도구 임베드/링크 |

## 2-3. Tech Stack
Next.js 14+ (App Router), TypeScript strict, Supabase, shadcn/ui + Tailwind, Recharts, Zustand, TanStack Query, React Hook Form + Zod, Vercel, pnpm

## 2-4. Core Architecture
- FIRE 계산: 100% 클라이언트 (순수 함수)
- 서버: 인증 + 저장 + 구독만
- 3-Layer: API Route → Service → Repository

## 2-5. DB Schema
Tables: profiles, saved_calculations, subscriptions, guides
- RLS enabled on all tables
- Soft delete for saved_calculations

## 2-6. API Endpoints
- POST /api/auth/callback
- GET/POST /api/calculations
- GET/DELETE /api/calculations/[id]
- GET/POST /api/subscriptions
- POST /api/subscriptions/portal
- GET /api/og

## 2-7. Pages
| Route | Type | Auth |
|-------|------|------|
| / | CC | No | Main calculator |
| /result | CC | No | Results (URL hash) |
| /saved | SC | Yes | Saved calculations |
| /premium | CC | No | Premium info |
| /guide/[slug] | SC | No | FIRE guides (SSG) |
| /login | CC | No | Login |
| /signup | CC | No | Signup |

## 2-8. FIRE Calculation Engine
- 9 input parameters (age, income, net worth, savings rate, expenses, return, inflation, SWR, retirement age)
- 5 FIRE types with multipliers: lean(0.6), regular(1.0), fat(1.5), barista(0.5), coast(compound growth)
- Real return = (1 + nominal) / (1 + inflation) - 1
- Target = expenses * multiplier / SWR
- Year-by-year simulation to age 80

## 2-9. Permission Matrix
| Feature | Anonymous | Free | Premium |
|---------|-----------|------|---------|
| Calculator | O | O | O |
| Save | X | 5 max | Unlimited |
| Scenarios | 2 | 2 | Unlimited |
| Monte Carlo | X | X | O |

## 2-10. Non-Functional Requirements
- LCP < 2.5s, FID < 100ms, CLS < 0.1
- WCAG 2.1 AA
- PWA support

## 2-11. Priority
- P0: Calculator engine + UI + chart + result cards + URL share + responsive
- P1: Auth + save + OG image + guides + scenarios
- P2: Premium subscription + Monte Carlo + portfolio optimization
