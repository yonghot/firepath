# PROGRESS.md

## 현재 상태
- 현재 Phase: P2 기능 구현 + 디자인 완성
- 마지막 업데이트: 2026-04-05
- 상태: P0 6/6, P1 7/7 (dark mode 추가), P2 2/3 (Monte Carlo 완료)

## [2026-04-05 03:15] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, ~2h < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음 (git diff HEAD~5 변화 없음)
- DESIGN.md 불일치 3건 → 모두 수정:
  1. 타이포그래피 스케일: h1 → text-4xl, h2 → text-3xl, h3 → text-2xl font-semibold
  2. 버튼 border-radius: rounded-lg → rounded-md (DESIGN.md: rounded-md)
  3. themeColor: metadata → viewport export (Next.js 16 요구사항)
- feature_list.json vs 코드: 불일치 0건

### 메인 태스크
- DESIGN.md 불일치 해소 (타이포그래피 + 버튼 + viewport)

### 추가 작업
1. F013 Monte Carlo Simulation (skip → pass):
   - 엔진: `src/lib/engine/monte-carlo.ts` (1000 시뮬레이션, Box-Muller 정규분포, 15% 변동성)
   - 차트: 10-90 퍼센타일 팬 차트 + FIRE 타겟 참조선
   - 결과: FIRE 타입별 성공 확률 + 중앙값 달성 나이
   - 프리미엄 게이트: 비프리미엄 사용자에게 잠금 UI + Premium 링크
   - 메인 페이지에 통합

2. F016 Dark Mode (신규 → pass):
   - next-themes ThemeProvider (system 기본, class attribute)
   - 헤더 + 모바일 네비에 테마 토글 추가
   - globals.css dark mode CSS 변수 이미 존재 → 활성화됨
   - suppressHydrationWarning 추가

3. 가이드 페이지 CTA h3 타이포그래피 수정

### 구현 상세
- 생성 파일:
  - `src/lib/engine/monte-carlo.ts` — 몬테카를로 시뮬레이션 엔진
  - `src/components/features/monte-carlo/monte-carlo-chart.tsx` — 팬 차트
  - `src/components/features/monte-carlo/monte-carlo-results.tsx` — 성공 확률 카드
  - `src/components/features/monte-carlo/monte-carlo-panel.tsx` — 통합 패널 (프리미엄 게이트)
  - `src/components/layouts/theme-toggle.tsx` — 다크모드 토글
- 수정 파일:
  - `src/components/ui/button.tsx` — rounded-lg → rounded-md
  - `src/app/layout.tsx` — viewport export + suppressHydrationWarning
  - `src/app/(main)/page.tsx` — h2 타이포그래피 + MonteCarloPanel 통합
  - `src/app/(main)/saved/page.tsx` — h1 text-4xl
  - `src/app/(main)/result/page.tsx` — h1 text-4xl
  - `src/app/(main)/premium/page.tsx` — h1 text-4xl
  - `src/app/(main)/guide/[slug]/page.tsx` — h1/h2/h3 DESIGN.md 스케일
  - `src/app/error.tsx` — h1 text-4xl
  - `src/components/features/scenario/scenario-comparison.tsx` — h2 text-3xl, h3 text-2xl
  - `src/components/providers.tsx` — ThemeProvider 추가
  - `src/components/layouts/header.tsx` — ThemeToggle 추가
  - `docs/architecture.md` — Monte Carlo 섹션 추가
  - `feature_list.json` — F013 pass, F016 추가

### 아키텍처 메모
- 몬테카를로 엔진은 클라이언트 전용 순수 함수 (Mulberry32 시드 PRNG로 결정적)
- 프리미엄 게이트는 컴포넌트 레벨 (isPremium prop). 서버 검증은 Stripe 연동 후 추가
- next-themes는 class 기반 전략. 기존 globals.css .dark 변수 활용

### 자가 검토
- REVIEW.md [MUST]: 해당 없음 (REVIEW.md에 [MUST] 항목 없음)
- feature_list.json AC: F013 pass, F016 pass
- DESIGN.md vs UI: 타이포그래피 수정 완료, 버튼 radius 수정 완료, dark mode 활성화
- PRD vs 구현: Monte Carlo 프리미엄 전용 (PRD 2-9 준수)
- 레이어 위반: 0건
- 빌드: PASS (경고 0건)

### 배포
- Git: push ❌ (git remote 미설정)
- 프로덕션: ❌ (Vercel 미설정)

### 판단 필요
- git remote가 설정되어 있지 않습니다. GitHub 리포지토리를 생성하고 `git remote add origin <URL>` 실행 필요.
- Vercel 배포 설정이 없습니다. `npx vercel` 초기 설정 또는 GitHub 연동 필요.

### 다음 세션 권장
1. RESEARCH.md 리서치 수행 (쿨다운 경과 후)
2. F012 Stripe 연동 (SECRET_KEY 환경변수 필요)
3. F014 Portfolio Optimization (P2, 남은 1개)
4. 프리미엄 Monte Carlo 활성화 (Stripe 연동 후 isPremium 동적 판정)
5. git remote + Vercel 배포 설정

---

## [2026-04-05 02:45] 자동 개발 세션
- DESIGN.md 불일치 2건 수정 (카드 shadow, h2 typography)
- F011 Scenario Comparison (pass): 2개 시나리오 저장/비교, 차트+테이블
- /api/subscriptions/portal 생성 (PRD 누락 보완)
- F015 PWA Support (pass): manifest, SVG icon, metadata
- 배포: ❌ (git remote/Vercel 미설정)

### [2026-04-05] 초기 프로토타입 완성
- Phase 0-4 완료: 하네스 → 분석 → 백엔드 → 프론트엔드 → QA
- P0 6/6 PASS, P1 4/5 PASS (시나리오 deferred), P2 1/3 partial
- 보안 수정: XSS, malformed JSON, NaN pagination, Zod error leak
- 디자인 시스템 완전 재구성 (DESIGN.md)
- Supabase DB 구축: 4 tables (RLS), 데모 데이터 시딩

## 핵심 결정 로그
1. shadcn/ui v4 (base-ui) — asChild 없음, 직접 스타일링
2. Zod v4 — `import from 'zod/v4'`
3. Inter 유지 — tabular-nums 지원이 금융 데이터에 적합
4. Supabase (cvlbdeaattcloitjvkvw, us-east-1)
5. XSS 방어 — HTML escape 함수 적용 (DOMPurify 대안)
6. 시나리오 비교: 클라이언트 전용 Zustand (서버 저장 불필요)
7. 몬테카���로: 클라이언트 전용, Mulberry32 시드 PRNG, Box-Muller 정규분포
8. 다크모드: next-themes (class 기반, system default)

## 미해결 이슈
1. [ ] Stripe Secret Key + Webhook 연동
2. [ ] Google OAuth provider 활성화 (Supabase dashboard)
3. [ ] SUPABASE_SERVICE_ROLE_KEY 설정
4. [ ] 시나리오 프리미엄 무제한 (서버 저장)
5. [ ] 포트폴리오 최적화 (F014)
6. [ ] Vercel 배포 + 커스텀 도메인
7. [ ] E2E 테스트 (Playwright)
8. [ ] seed 자격증명을 환경변수로 이동
9. [ ] git remote 설정

## 파일 인벤토리 (핵심)
```
CLAUDE.md           — 프로젝트 지침서
PRD.md              — 제품 요구사항
DESIGN.md           — 디자인 시스템
REVIEW.md           — 코드 리뷰 로그
feature_list.json   — 기능 pass/fail 판정
docs/PROGRESS.md    — 이 파일
docs/prd-analysis.md — PRD 분석
docs/architecture.md — 아키텍처 설계
scripts/seed.ts     — 데모 데이터 시딩
```
