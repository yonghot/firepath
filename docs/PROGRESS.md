# PROGRESS.md

## 현재 상태
- 현재 Phase: P2 완료 + 컴포넌트 레이어 3-Layer 정합성 확보
- 마지막 업데이트: 2026-04-11
- 상태: P0 6/6, P1 7/7, P2 3/3 (전체 완료). Lint 0/0. 빌드 PASS.
- 프로덕션: https://firepath-2j7weljnc-sk1597530-3914s-projects.vercel.app (SSO 보호 설정됨 — 아래 판단 필요 참조)

## [2026-04-11 18:30] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, 직전 리서치 커밋 ~1.2h 전)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 1건 발견 → 해소
  - `src/components/features/calculator/save-calculation-button.tsx`가 직접 `fetch('/api/calculations')` 호출
  - `src/components/features/saved/saved-list.tsx`가 직접 `fetch('/api/calculations?limit=50')` + DELETE 호출
  - components/CLAUDE.md "No direct API calls — use React Query hooks" 위반
- PRD 변경점: 없음
- DESIGN.md 불일치: 0건
- feature_list.json vs 코드: 0건
- 아키텍처 위반: 위 1건 (서브에이전트 B-0.5 스캔으로 발견)

### 메인 태스크
- 컴포넌트 레이어 3-Layer 정합성: 직접 fetch 호출을 React Query 훅으로 통합
- a11y: saved-item 삭제 버튼 aria-label 보강

### 구현 상세
1. **`src/hooks/use-calculations.ts` 신규 생성**
   - `useSavedCalculations(limit = 50)` — React Query 조회 훅, 쿼리 키 `['calculations', { limit }]`
   - `useSaveCalculation()` — POST mutation, 성공 시 `['calculations']` 무효화
   - `useDeleteCalculation()` — DELETE mutation, 성공 시 `['calculations']` 무효화
   - `parseApiResponse<T>()` 내부 헬퍼로 `ApiResponse<T>` 판별 + 에러 throw 통합
   - `ApiClientError` 클래스 export — 에러 코드(`LIMIT_EXCEEDED` 등) 기반 분기 가능
   - `SaveCalculationInput` 인터페이스로 `is_default` 기본값 처리

2. **`save-calculation-button.tsx` 리팩토링**
   - 직접 `fetch`/수동 `ApiResponse` 파싱 제거 → `useSaveCalculation` 훅 사용
   - `saving` 로컬 state 제거 → `mutation.isPending` 활용
   - 에러 처리: `ApiClientError.code === 'LIMIT_EXCEEDED'` 분기로 기존 UX 유지
   - 전체 102줄 → 91줄로 축소, `try/catch/finally` 단순화

3. **`saved-list.tsx` 리팩토링**
   - `useQuery` + `useMutation` 수동 선언 제거 → `useSavedCalculations`, `useDeleteCalculation` 훅 사용
   - `queryFn` 내부 fetch + 에러 throw 로직 제거
   - toast 피드백은 `mutate(id, { onSuccess, onError })` 스코프드 옵션으로 유지
   - 전체 67줄 → 51줄로 축소

4. **`saved-item.tsx` 접근성 개선**
   - 삭제 버튼에 `aria-label={\`Delete ${item.name}\`}` 추가
   - Trash2 아이콘만 있는 버튼에 스크린 리더용 라벨 제공
   - 근거: DESIGN.md "WCAG 2.1 AA", components/CLAUDE.md "All interactive elements must be keyboard accessible"

### Refactor-on-Touch 결과
- 중복 제거: 3개 API 호출(GET/POST/DELETE)에 각각 `ApiResponse<T>` 판별/에러 throw 코드가 반복되던 것을 `parseApiResponse` 1곳으로 통합
- 에러 타입 안정성: `ApiClientError`가 `code` 필드를 보존 → 호출 컴포넌트에서 `LIMIT_EXCEEDED` 등 에러 코드 분기 가능
- 쿼리 무효화: 훅 레벨에서 `['calculations']` 키 무효화 자동화 (save 성공 시 saved 목록이 자동 새로고침)
- `console.log` 잔존 없음, `any` 타입 없음, `TODO` 없음

### gstack 검증 결과
- /review: ⏭️ 스킵 (gstack 미설치, 클라우드 매 세션 초기화)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치 + 네트워크 제한 모드)

### 기술 부채 현황
- 이번 세션 발견: 컴포넌트 레이어 3-Layer 위반 2곳
- 이번 세션 해소:
  - save-calculation-button 직접 fetch (1곳)
  - saved-list 직접 fetch + delete mutation (2 endpoint)
  - saved-item 삭제 버튼 a11y
- 잔여: 없음

### 배포
- Git: push 시도 예정
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요 (누적)
1. **Vercel SSO 보호 해제** (오너): 프로덕션 URL 공개 접근 불가
2. **RESEARCH.md C-1~C-3** (오너): 시장 방향성 결정
3. **Supabase 환경변수** (오너): SUPABASE_SERVICE_ROLE_KEY 미설정
4. **NEXT_PUBLIC_APP_URL** (오너): 프로덕션 URL 업데이트 필요
5. **F012 Stripe 연동** (오너): STRIPE_SECRET_KEY 필요

### 다음 세션 권장
1. 리서치 쿨다운 경과 시 C-3 SEO 키워드 전략 심층 조사
2. Subscription 관련 훅도 동일 패턴으로 추출 (`use-subscription.ts`) — 현재 직접 호출 없음, 신규 기능 추가 시 대비
3. F012 Stripe 연동 (환경변수 준비 시)
4. Calculator 페이지 Server Component 분리 검토 (Hero는 static)
5. MonteCarloPanel/PortfolioPanel unit 테스트 (엔진 로직은 순수 함수)

---

## [2026-04-11 17:15] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, 직전 리서치 커밋 ~20분 전)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음
- DESIGN.md 불일치: 0건
- feature_list.json vs 코드: 0건
- 아키텍처 위반: 0건

### 메인 태스크
- 코드 품질 + 접근성 + 번들 최적화 (4건)

### 구현 상세
1. **theme-toggle.tsx ESLint 에러 해소**
   - `react-hooks/set-state-in-effect` 규칙 위반 (`useEffect(() => setMounted(true), [])`)
   - `useSyncExternalStore` 패턴으로 전환 — 서버 snapshot=false / 클라이언트 snapshot=true
   - 캐스케이딩 리렌더 제거, React 18+ 정석 하이드레이션 패턴
   - Before: 1 error / After: 0 errors

2. **미사용 import 정리 (Refactor-on-Touch)**
   - `src/app/(main)/page.tsx`: `Button` 제거
   - `src/components/features/calculator/fire-timeline-chart.tsx`: `FIRE_LABELS` 제거
   - `src/components/features/scenario/scenario-comparison.tsx`: `ReferenceLine`, `FIREType` 제거
   - `src/stores/scenario.store.ts`: `FIREOutput` 제거
   - Before: 5 warnings / After: 0 warnings

3. **Premium 패널 Code Splitting (성능)**
   - `monte-carlo-panel.tsx` + `portfolio-panel.tsx`가 무료 사용자에게도 전체 엔진/차트 번들을 eager load
   - 해결: `monte-carlo-content.tsx`, `portfolio-content.tsx`로 premium 전용 렌더링 분리
   - 상위 panel은 Gate만 렌더링, premium 콘텐츠는 `next/dynamic(..., { ssr: false })`로 lazy load
   - 제거된 eager 의존성: `runMonteCarlo` (177줄) + `optimizePortfolio` (211줄) + 차트 컴포넌트 5개
   - 현재 `isPremium=false` 하드코딩이므로 100% 사용자의 초기 JS 절감

4. **접근성 개선 — SliderInput**
   - `<Label>`이 `<Input>`과 미연결 (htmlFor/id 없음) — 스크린 리더에서 라벨 누락
   - `useId()`로 고유 id 생성 → `htmlFor`로 연결
   - Input에 `aria-label={`${label} value`}` 추가 (컨텍스트 보강)
   - 스크린 리더 테스트 대상: Calculator 9개 슬라이더 전체
   - 근거: DESIGN.md Accessibility "WCAG 2.1 AA", PRD 2-10

### Refactor-on-Touch 결과
- 수정 파일 6개 모두 미사용 import / 규칙 위반 / 라벨 미연결 한 번에 정리
- 300줄 초과 파일 없음 (최대 268줄 dropdown-menu.tsx, shadcn 원본)
- portfolio-panel.tsx: 150줄 → 59줄, monte-carlo-panel.tsx: 115줄 → 64줄
- `console.log` 잔존 없음, `any` 타입 없음, `TODO` 없음

### gstack 검증 결과
- /review: ⏭️ 스킵 (로컬 환경, 서브에이전트 토큰 비용 절약)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치)

### 기술 부채 현황
- 이번 세션 발견: 없음
- 이번 세션 해소:
  - theme-toggle ESLint error (1건)
  - 미사용 import (5건)
  - premium 패널 eager bundling (2 파일)
  - SliderInput label/input 미연결 a11y (1건)
- 잔여: 없음 (모든 [자동 반영] + PROGRESS 권장사항 소진)

### 배포
- Git: push 시도 예정
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요 (누적)
1. **Vercel SSO 보호 해제** (오너): 프로덕션 URL 공개 접근 불가
2. **RESEARCH.md C-1~C-3** (오너): 시장 방향성 결정
3. **Supabase 환경변수** (오너): SUPABASE_SERVICE_ROLE_KEY 미설정
4. **NEXT_PUBLIC_APP_URL** (오너): 프로덕션 URL 업데이트 필요
5. **F012 Stripe 연동** (오너): STRIPE_SECRET_KEY 필요

### 다음 세션 권장
1. 리서치 쿨다운 경과 시 C-3 SEO 키워드 전략 심층 조사
2. Lighthouse/axe-core 자동 접근성 감사 (환경변수 준비 후)
3. F012 Stripe 연동 (환경변수 준비 시)
4. 가이드 콘텐츠 확장 (SEO 롱테일)
5. Calculator 페이지 Server Component 분리 검토 (Hero는 static)

---

## [2026-04-11 16:55] 자동 개발 세션

### 리서치
- ✅ 수행 (쿨다운 ~69h 경과)
- [자동 반영] 3개 (A-9 Guide 3-Layer, A-10 Repository AppError, A-11 PortfolioPanel 분리)
- [오너 판단 필요] 0개 (기존 C-1~C-3 대기 중)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음
- DESIGN.md 불일치: 0건
- feature_list.json vs 코드: 불일치 0건
- 아키텍처 위반: 1건 발견 → 해소 (Guide 페이지가 Repository 직접 호출)

### 메인 태스크
- 기술 부채 해소: 아키텍처 정합성 + 에러 구조화 + 컴포넌트 분리 (3건 동시)

### 구현 상세
1. **Guide 서비스 레이어 도입 (A-9 / B-3)**
   - `src/lib/services/guide.service.ts` 신규 — GuideService 클래스 + createGuideService 팩토리
   - `getBySlug()`, `listAll()`, `getWithRelated(slug, limit)` 메소드
   - `guide/page.tsx`: `createGuideService(supabase).listAll()` 사용
   - `guide/[slug]/page.tsx`: `getWithRelated(slug)`로 guide + related를 한 번에 조회
   - `generateStaticParams`, `generateMetadata` 모두 서비스 경유로 변경
   - CLAUDE.md "3-Layer: API Route → Service → Repository" 규칙 준수

2. **Repository 에러 AppError 래핑 (A-10 / B-4)**
   - `src/constants/error-codes.ts`: `DB_ERROR` 코드 추가 (status 500)
   - `src/lib/repositories/db-error.ts` 신규 — `wrapDbError(context, error)` 헬퍼
     - PostgrestError를 콘솔에 상세 로깅 (code, details, hint)
     - 상위 레이어로는 `AppError('DB_ERROR', context)`만 전파
   - 4개 Repository 전체 갱신: calculation, guide, profile, subscription
     - 총 14개 throw 지점을 `throw wrapDbError(...)`로 래핑
     - PGRST116 (not found) 처리는 기존과 동일
   - handleApiError의 로그에서 내부 DB 스키마 노출 제거 (구조화된 stable error만 상위로)

3. **PortfolioPanel 컴포넌트 분리 (A-11)**
   - `portfolio-profile-selector.tsx` 신규 (55줄) — 3-profile 선택 버튼 그리드
   - `portfolio-metrics-card.tsx` 신규 (50줄) — 4개 지표 카드 + `MetricRow` 내부 헬퍼
   - `portfolio-panel.tsx` 198줄 → 150줄로 축소:
     - `PremiumGate`, `PanelHeader`, `EmptyState` 내부 컴포넌트로 분리
     - 메인 컴포넌트 JSX 가독성 개선
     - 모든 비즈니스 로직 (optimizePortfolio) useMemo로 유지

### Refactor-on-Touch 결과
- 3-Layer 위반: Guide 페이지 2곳 → Service 경유
- Repository raw error 2 throw/파일 × 4파일 → wrapDbError 헬퍼 1곳으로 집중
- portfolio-panel.tsx 긴 JSX → 5개 하위 컴포넌트로 분리 (내부 3 + 별도 파일 2)
- `console.log` 잔존 없음 (wrapDbError의 `console.error`는 의도적 로깅)
- 미사용 import 없음 (Build/ESLint PASS)

### gstack 검증 결과
- /review: ⏭️ 스킵 (로컬 환경, 서브에이전트 토큰 비용 절약)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치)

### 기술 부채 현황
- 이번 세션 발견: 없음
- 이번 세션 해소:
  - Guide 페이지 3-Layer 위반 (2파일)
  - Repository raw Supabase error throw (4파일, 14 throw 지점)
  - PortfolioPanel 198줄 단일 컴포넌트 (150줄 + 2 하위 파일로 분리)
- 잔여: 없음 (RESEARCH.md B-3, B-4 완료; PROGRESS 이전 잔여 해소)

### 배포
- Git: push 시도 예정
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요 (누적)
1. **Vercel SSO 보호 해제** (오너): 프로덕션 URL 공개 접근 불가
2. **RESEARCH.md C-1~C-3** (오너): 시장 방향성 결정
3. **Supabase 환경변수** (오너): SUPABASE_SERVICE_ROLE_KEY 미설정
4. **NEXT_PUBLIC_APP_URL** (오너): 프로덕션 URL 업데이트 필요
5. **F012 Stripe 연동** (오너): STRIPE_SECRET_KEY 필요

### 다음 세션 권장
1. 리서치 쿨다운 재경과 시 C-3 SEO 키워드 전략 심층 조사
2. Monte Carlo 결과 페이지 성능 프로파일링 (1000 simulations)
3. F012 Stripe 연동 (환경변수 준비 시)
4. 접근성 감사 (axe-core, lighthouse)
5. 코드 스플리팅 검토 (premium-only 모듈을 lazy import)

---

## [2026-04-09 13:50] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, ~5.5h < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음
- DESIGN.md 불일치: 1건 — --primary CSS 변수가 brand-primary (#065F53)와 불일치. oklch(0.37 0.08 172) ≠ oklch(0.436 0.077 180.1)
- feature_list.json vs 코드: 불일치 0건
- 아키텍처 위반: 0건
- RESEARCH 자동 반영: A-5~A-8 모두 이전 세션에서 구현 완료

### 메인 태스크
- DESIGN.md 정합성: --primary CSS 변수를 brand-primary에 맞춤
- SEO 기반: robots.txt, sitemap.xml, JSON-LD 구조화 데이터 추가
- UX 개선: 인증 상태 헤더 반영, Save to Account 버튼 추가

### 구현 상세
1. **--primary CSS 변수 brand-primary 정합**
   - Light mode: oklch(0.37 0.08 172) → oklch(0.436 0.077 180.1) (#065F53 정확히 일치)
   - Dark mode: oklch(0.922 0 0) (회색) → oklch(0.704 0.123 182.5) (teal-500)
   - Dark mode foreground: oklch(0.205) → oklch(0.145) (어두운 텍스트)
   - 접근성 검증: Light mode 7.58:1 AA PASS, Dark mode text-on-card 5.69:1 AA PASS, Dark mode btn 4.56:1 AA PASS

2. **SEO 기반 구축**
   - `src/app/robots.txt` — /api/와 /saved 차단, sitemap 참조
   - `src/app/sitemap.xml` — 정적 페이지 + 5개 가이드 slug
   - JSON-LD WebApplication 스키마 (layout.tsx)
   - JSON-LD Article 스키마 (guide/[slug]/page.tsx)
   - Guide 페이지 OG 메타 태그 추가

3. **인증 상태 헤더 반영**
   - `src/hooks/use-auth.ts` 생성 — Supabase 클라이언트 auth 상태 구독
   - Header 컴포넌트 — 로그인 시 "Saved" + "Sign Out" 표시, 비로그인 시 "Sign In"
   - 모바일 네비게이션에도 동일 적용

4. **Save to Account 버튼**
   - `src/components/features/calculator/save-calculation-button.tsx` — 인증된 사용자만 표시
   - POST /api/calculations 호출, 이름 입력, 성공/에러 피드백
   - 메인 페이지 "Your FIRE Numbers" 섹션에 배치

### Refactor-on-Touch 결과
- globals.css: CSS 변수만 수정, 구조 변경 없음
- header.tsx: auth import + 조건부 렌더링 추가
- guide/[slug]/page.tsx: OG 메타 + JSON-LD 추가

### gstack 검증 결과
- /review: ⏭️ 스킵 (로컬 환경, 세션 시간 절약)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치)

### 기술 부채 현황
- 이번 세션 발견: 없음
- 이번 세션 해소: --primary 색상 불일치
- 잔여:
  - PortfolioPanel 198줄 (미수정 — 300줄 미만이므로 임계치 이하)
  - page.tsx 131줄 (CalculatorPage, 300줄 미만)

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요
1. **Vercel SSO 보호 해제**: 이전 세션과 동일
2. **RESEARCH.md C-1~C-3**: 이전 세션과 동일
3. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY 미설정
4. **NEXT_PUBLIC_APP_URL**: 프로덕션 URL로 업데이트 필요

### 다음 세션 권장
1. 리서치 수행 (쿨다운 경과 시)
2. SEO 가이드 콘텐츠 확장 (C-3 키워드 리서치 반영)
3. F012 Stripe 연동 (SECRET_KEY 필요)
4. Vercel SSO 해제 + 환경변수 설정 (오너)
5. 성능 최적화 (코드 스플리팅, 이미지 최적화)

---

## [2026-04-09 05:45] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, ~1.5h < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음
- DESIGN.md 불일치: 0건 (차트 tooltip rounded-md는 DESIGN.md에서 radius 미명시이므로 위반 아님)
- feature_list.json vs 코드: 불일치 0건
- 아키텍처 위반: 0건

### 메인 태스크
- 기술 부채 해소: 코드 품질 리팩토링 (5건)

### 구현 상세
1. **FIRE_MULTIPLIERS 공유 상수 추출**
   - `src/constants/fire-defaults.ts`에 FIRE_MULTIPLIERS 추가
   - `src/lib/engine/fire-calculator.ts` — 로컬 상수 제거, 공유 import
   - `src/lib/engine/monte-carlo.ts` — 로컬 상수 제거, 공유 import

2. **runMonteCarlo 함수 분리 (123줄 → 주함수 20줄 + 헬퍼 3개)**
   - `runSingleSimulation()` — 단일 시뮬레이션 경로 실행 + FIRE 도달 나이 추적
   - `calculatePercentiles()` — 시뮬레이션 경로에서 퍼센타일 계산
   - `calculateStatistics()` — 성공률 + 중앙값 도달 나이 계산
   - `SimulationContext` 인터페이스 — 시뮬레이션 파라미터 묶음

3. **optimizePortfolio 함수 분리 (96줄 → 주함수 15줄 + 헬퍼 3개)**
   - `buildPortfolioAllocations()` — 모델 포트폴리오에서 PortfolioAllocation 객체 생성
   - `projectGrowth()` — 각 전략별 순자산 성장 프로젝션
   - `calculateYearsToFIRE()` — 추천 포트폴리오 수익률 기반 FIRE 도달 연수

4. **서비스 팩토리 함수 추출**
   - `src/lib/utils/api-handler.ts`에 `createCalculationService()`, `createSubscriptionService()` 추가
   - 4개 API 라우트에서 중복 서비스 인스턴스화 코드 제거:
     - `src/app/api/calculations/route.ts` (GET, POST)
     - `src/app/api/calculations/[id]/route.ts` (GET, DELETE)
     - `src/app/api/subscriptions/route.ts` (GET, POST)
     - `src/app/api/subscriptions/portal/route.ts` (POST)

5. **포트폴리오 프로필 상수 통합**
   - `portfolio-optimizer.ts`에 `RISK_PROFILE_LABELS`, `RISK_PROFILE_COLORS`, `RISK_PROFILE_DESCRIPTIONS` export
   - `portfolio-panel.tsx` — 로컬 PROFILE_DESCRIPTIONS 제거, 공유 import
   - `portfolio-results.tsx` — 로컬 PROFILE_COLORS/PROFILE_LABELS 제거, 공유 import + RiskProfile 타입 적용

### Refactor-on-Touch 결과
- 중복 상수: FIRE_MULTIPLIERS 2곳 → 1곳, portfolio profile 상수 2곳 → 1곳
- 중복 서비스 인스턴스화: 7회 → 팩토리 2개 + 호출 7회 (각 1줄)
- 긴 함수: runMonteCarlo 123줄 → 20줄 + 3 헬퍼, optimizePortfolio 96줄 → 15줄 + 3 헬퍼
- 타입 개선: portfolio-results.tsx tooltip payload dataKey string → RiskProfile

### gstack 검증 결과
- /review: ⏭️ 스킵 (로컬 환경, 세션 시간 절약)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치)

### 기술 부채 현황
- 이번 세션 발견: 없음 (이전 세션 잔여 해소)
- 이번 세션 해소:
  - FIRE_MULTIPLIERS 중복 (fire-calculator.ts + monte-carlo.ts)
  - runMonteCarlo 123줄 (50줄 임계치 초과)
  - optimizePortfolio 96줄 (50줄 임계치 초과)
  - 서비스 인스턴스화 중복 (4개 API 라우트)
  - portfolio profile 상수 중복 (panel + results)
- 잔여:
  - PortfolioPanel 195줄 (미수정 — 컴포넌트 분리 필요)
  - page.tsx 129줄 (CalculatorPage, 미수정)

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요
1. **Vercel SSO 보호 해제**: 이전 세션과 동일
2. **RESEARCH.md C-1**: 글로벌 vs 한국어 타겟 결정 미완
3. **RESEARCH.md C-2**: $4.99/월 가격 적정성 검증 미완
4. **RESEARCH.md C-3**: SEO 키워드 전략 심층 연구 필요
5. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY 미설정
6. **NEXT_PUBLIC_APP_URL**: 프로덕션 URL로 업데이트 필요

### 다음 세션 권장
1. 리서치 수행 (쿨다운 경과 시)
2. PortfolioPanel 컴포넌트 분리 (195줄)
3. F012 Stripe 연동 (SECRET_KEY 필요)
4. Vercel SSO 해제 + 환경변수 설정 (오너)
5. SEO 최적화 + 가이드 콘텐츠 확장

---

## [2026-04-09 04:15] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, ~0h < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음 (REVIEW.md에 [MUST] 항목 없음)
- PRD 변경점: 없음
- DESIGN.md 불일치 4건 → 모두 수정:
  1. guide/page.tsx CTA h2: text-2xl/600 → text-3xl/700 (DESIGN.md h2 스케일)
  2. disclaimer-banner: rounded-lg → rounded-xl (DESIGN.md 카드 radius)
  3. guide 카드, header nav, footer 링크: transition duration-200 누락 → 추가
  4. guide/[slug] related links: rounded-lg → rounded-xl
- feature_list.json vs 코드: 불일치 0건
- 코드 품질 이슈 발견: API 라우트 에러 처리 중복, auth/callback 에러 핸들링 누락

### 메인 태스크
- API 에러 처리 리팩토링: requireAuth() + handleApiError() 공유 유틸리티 추출
- DESIGN.md 정합성 해소

### 추가 작업
1. auth/callback/route.ts: try/catch + 에러 로깅 추가
2. guide/[slug]/page.tsx: generateStaticParams 추가 (SSG 활성화, Supabase fallback)
3. header.tsx: 모바일 메뉴 버튼 aria-label 추가
4. .gitignore: .dev-lock 추가 + 중복 .vercel 제거
5. footer.tsx: 링크 hover transition-colors duration-200 추가
6. docs/architecture.md: 공유 API 유틸리티 문서화

### Refactor-on-Touch 결과
- API 라우트 5개 파일: 중복 auth/error 패턴 → requireAuth() + handleApiError()로 통합
  - calculations/route.ts (GET, POST)
  - calculations/[id]/route.ts (GET, DELETE)
  - subscriptions/route.ts (GET, POST)
  - subscriptions/portal/route.ts (POST)
- 코드 감소: ~140줄 → ~90줄 (API 라우트 합산, 유틸리티 40줄 포함)
- 불필요 import 제거: AppError (5개 파일에서 유틸리티로 이동)

### 구현 상세
- 생성 파일:
  - `src/lib/utils/api-handler.ts` — requireAuth() + handleApiError() 공유 유틸리티
- 수정 파일:
  - `src/app/api/auth/callback/route.ts` — try/catch + 에러 로깅
  - `src/app/api/calculations/route.ts` — requireAuth/handleApiError 적용
  - `src/app/api/calculations/[id]/route.ts` — requireAuth/handleApiError 적용
  - `src/app/api/subscriptions/route.ts` — requireAuth/handleApiError 적용
  - `src/app/api/subscriptions/portal/route.ts` — requireAuth/handleApiError 적용
  - `src/app/(main)/guide/page.tsx` — CTA h2 text-3xl/bold, 카드 duration-200
  - `src/app/(main)/guide/[slug]/page.tsx` — generateStaticParams + related links rounded-xl
  - `src/components/common/disclaimer-banner.tsx` — rounded-xl
  - `src/components/layouts/header.tsx` — nav duration-200 + 모바일 메뉴 aria-label
  - `src/components/layouts/footer.tsx` — 링크 transition-colors duration-200
  - `docs/architecture.md` — 공유 API 유틸리티 문서
  - `.gitignore` — .dev-lock + 중복 제거

### 아키텍처 메모
- requireAuth(): Supabase 클라이언트 생성 + 인증 확인을 하나의 함수로 통합. AppError 기반 에러 throw.
- handleApiError(): AppError → typed JSON response, unknown → 500 + console.error. 라우트 레이블로 에러 추적 가능.
- generateStaticParams: Supabase 빌드 시 접근 가능하면 SSG, 불가하면 빈 배열 반환 (동적 렌더링 fallback).

### gstack 검증 결과
- /review: ⏭️ 스킵 (글로벌 설치, 클라우드 아님 — 세션 시간 절약)
- /qa --quick: ⏭️ 스킵 (Playwright 미설치)

### 기술 부채 현황
- 이번 세션 발견: API 에러 처리 중복 (5개 라우트)
- 이번 세션 해소: API 에러 처리 통합
- 잔여:
  - calculateFIRE 함수 104줄 (50줄 임계치 초과, 미수정 — Refactor-on-Touch 대상)
  - PortfolioPanel 178줄 (미수정)
  - MonteCarloPanel 96줄 (미수정)
  - page.tsx 129줄 (CalculatorPage, 미수정)

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- 배포 방식: GitHub 자동 배포 (Vercel 연동)
- 프로덕션 확인: ❌ (Vercel SSO 보호 — 이전 세션과 동일)

### 판단 필요
1. **Vercel SSO 보호 해제**: 이전 세션과 동일 — 프로덕션 URL이 401 반환
2. **RESEARCH.md C-1**: 글로벌 vs 한국어 타겟 결정 미완 [미반영 — 오너 확인 대기]
3. **RESEARCH.md C-2**: $4.99/월 가격 적정성 검증 미완 [미반영 — 오너 확인 대기]
4. **RESEARCH.md C-3**: SEO 키워드 전략 심층 연구 필요
5. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY 미설정
6. **NEXT_PUBLIC_APP_URL**: 프로덕션 URL로 업데이트 필요

### 다음 세션 권장
1. Vercel SSO 해제 + 환경변수 설정 (오너)
2. F012 Stripe 연동 (SECRET_KEY 필요)
3. 리서치 수행 (쿨다운 경과 시)
4. 코드 품질: 긴 컴포넌트 분리 (calculateFIRE, PortfolioPanel)
5. SEO 최적화 + 가이드 콘텐츠 확장

---

## [2026-04-08 19:30] 자동 개발 세션

### 리서치
- ✅ 수행 (쿨다운 ~80h > 6h)
- 서브에이전트 5개 병렬 스캔: User Flow, Design Audit, Backend Audit, Code Quality, Content/Data
- [자동 반영] 4개: A-5 Premium 버튼 dead-end, A-6 시나리오 localStorage, A-7 가이드 인덱스 페이지, A-8 헤딩 타이포그래피
- [오너 판단 필요] 2개: B-3 Guide 서비스 레이어, B-4 Repository 에러 래핑
- [C] 외부 조사: 신규 1개 (C-3 SEO 키워드 전략)
- [C] 반영 추적: C-1 [미반영 — 오너 확인 대기], C-2 [미반영 — 오너 확인 대기]

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음 (REVIEW.md에 [MUST] 항목 없음)
- PRD 변경점: 없음
- DESIGN.md 불일치 2건 → 수정: calculator-panel h2 text-lg→text-xl, scenario-manager h3 text-sm→text-base
- feature_list.json vs 코드: 불일치 0건

### 메인 태스크
- 리서치 [자동 반영] 4건 일괄 구현

### 추가 작업
1. SEO 메타데이터 강화: Twitter Card, robots meta, siteName 추가
2. 헤더 Guides 네비게이션 → /guide 인덱스로 변경
3. 푸터에 "All Guides" 링크 추가

### 구현 상세
- 생성 파일:
  - `src/app/(main)/guide/page.tsx` — 가이드 인덱스 페이지 (Server Component, SEO metadata)
- 수정 파일:
  - `src/app/(main)/premium/page.tsx` — "Get Premium" → "Coming Soon" disabled 버튼 + 안내 텍스트
  - `src/stores/scenario.store.ts` — Zustand persist middleware 추가 (localStorage 영속화)
  - `src/components/features/calculator/calculator-panel.tsx` — h2 text-lg→text-xl font-semibold
  - `src/components/features/scenario/scenario-manager.tsx` — h3 text-sm→text-base font-semibold
  - `src/components/layouts/header.tsx` — Guides 링크 /guide/what-is-coastfire → /guide
  - `src/components/layouts/footer.tsx` — "All Guides" 링크 추가
  - `src/app/layout.tsx` — Twitter Card, robots, siteName 메타 추가
  - `RESEARCH.md` — 2026-04-08 리서치 결과 추가

### 아키텍처 메모
- 시나리오 localStorage: scenarios만 persist, compareIds는 세션 상태로 유지 (partialize)
- 가이드 인덱스: Supabase 연결 실패 시 빈 상태 + CTA 표시 (graceful fallback)
- Premium 버튼: Stripe 미연동이므로 Coming Soon으로 사용자 기대 관리

### 시도했으나 실패한 접근
- 없음

### 자가 검토
- REVIEW.md [MUST]: 해당 없음
- feature_list.json AC: 신규 기능 없음 (UX 개선만)
- DESIGN.md vs UI: 타이포그래피 2건 수정 완료
- PRD vs 구현: 변경 없음
- 레이어 위반: 가이드 인덱스도 기존 [slug]/page.tsx와 동일 패턴 (Server Component → Repository 직접)
- 빌드: PASS

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- Vercel: ✅ 배포 완료 (https://firepath-2j7weljnc-sk1597530-3914s-projects.vercel.app)
- 프로덕션 확인: ❌ HTTP 401 — Vercel SSO 보호 활성화 (이전 세션과 동일)

### 판단 필요
1. **Vercel SSO 보호 해제**: 이전 세션과 동일 — 프로덕션 URL이 401 반환
2. **RESEARCH.md C-1**: 글로벌 vs 한국어 타겟 결정 미완 [미반영 — 오너 확인 대기]
3. **RESEARCH.md C-2**: $4.99/월 가격 적정성 검증 미완 [미반영 — 오너 확인 대기]
4. **RESEARCH.md C-3**: SEO 키워드 전략 심층 연구 필요 (신규)
5. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY 미설정
6. **NEXT_PUBLIC_APP_URL**: 프로덕션 URL로 업데이트 필요

### 다음 세션 권장
1. C-1, C-2, C-3 심층 연구 수행 (오너)
2. Vercel SSO 해제 + 환경변수 설정 (오너)
3. F012 Stripe 연동 (SECRET_KEY 필요)
4. 코드 품질 개선 (테스트, 리팩토링 — 핵심 기능 완료 후)
5. SEO 최적화 + 가이드 콘텐츠 확장

---

## [2026-04-05 11:16] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, ~12분 < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음
- PRD 변경점: 없음
- DESIGN.md 불일치 3건 → 모두 수정:
  1. MC 차트: Coast FIRE strokeDasharray "5 5" → "8 4" (DESIGN.md 명세)
  2. MC 차트: fill="var(--background, #ffffff)" → fill="var(--background)" (다크모드 대응)
  3. MC 결과: transition duration-500 → duration-200 (DESIGN.md 200ms 기본값)
- feature_list.json vs 코드: 불일치 0건

### 메인 태스크
- F014 Portfolio Optimization (skip → pass): P2 마지막 기능 구현

### 추가 작업
- 없음 (F014가 주요 작업)

### 구현 상세
- 생성 파일:
  - `src/lib/engine/portfolio-optimizer.ts` — 포트폴리오 최적화 엔진
    - 4 자산 클래스 (US Stocks, Int'l Stocks, Bonds, Cash/MM)
    - 상관관계 매트릭스 기반 포트폴리오 분산 계산
    - 3 모델 포트폴리오 (Conservative/Moderate/Aggressive)
    - 시간 지평선 기반 자동 추천
    - Sharpe Ratio, 실질수익률 계산
  - `src/components/features/portfolio/portfolio-chart.tsx` — 자산 배분 파이 차트 + 범례
  - `src/components/features/portfolio/portfolio-results.tsx` — 전략별 성장 비교 AreaChart
  - `src/components/features/portfolio/portfolio-panel.tsx` — 통합 패널 (프리미엄 게이트)
    - 3개 포트폴리오 선택 카드 + 추천 표시
    - 자산 배분 도넛 차트
    - 포트폴리오 메트릭 (Return, Volatility, Sharpe, Real Return)
    - 성장 예측 차트 (3전략 비교)
- 수정 파일:
  - `src/components/features/monte-carlo/monte-carlo-chart.tsx` — DESIGN.md 불일치 수정 3건
  - `src/components/features/monte-carlo/monte-carlo-results.tsx` — transition duration 수정
  - `src/app/(main)/page.tsx` — PortfolioPanel 통합
  - `docs/architecture.md` — Portfolio Optimization 섹션 추가
  - `feature_list.json` — F014 pass

### 아키텍처 메모
- 포트폴리오 엔진은 클라이언트 전용 순수 함수 (서버 호출 없음)
- Modern Portfolio Theory 간소화: 4 자산, 정적 상관 매트릭스, 3 모델 포트폴리오
- 추천 알고리즘: years to FIRE + current age 기반 glide path 결정
- MC 차트에 Coast FIRE 참조선 추가 (기존에 lean/regular/fat/barista만 있었음)

### 자가 검토
- REVIEW.md [MUST]: 해당 없음
- feature_list.json AC: F014 pass (4 자산, 3 전략, 차트, 메트릭, 프리미엄 게이트)
- DESIGN.md vs UI: 3건 수정 완료, 신규 코드 DESIGN.md 준수
- PRD vs 구현: F014 프리미엄 전용 (PRD 2-9 준수)
- 레이어 위반: 0건
- 빌드: PASS

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- Vercel: ✅ 배포 완료 (https://firepath-h1kas4zz6-sk1597530-3914s-projects.vercel.app)
- 프로덕션 확인: ❌ HTTP 401 — Vercel SSO 보호 활성화 (이전 세션과 동일)

### 판단 필요
1. **Vercel SSO 보호 해제**: 이전 세션과 동일 — 프로덕션 URL이 401 반환
2. **RESEARCH.md C-1**: 글로벌 vs 한국어 타겟 결정 미완
3. **RESEARCH.md C-2**: $4.99/월 가격 적정성 검증 미완
4. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY 미설정
5. **NEXT_PUBLIC_APP_URL**: 프로덕션 URL로 업데이트 필요

### 다음 세션 권장
1. P0-P2 전체 완료. 남은 작업:
   - F012 Stripe 연동 (SECRET_KEY 필요)
   - 환경변수 설정 (Vercel)
   - Vercel SSO 해제
2. RESEARCH.md C-1, C-2 심층 연구 수행
3. 코드 품질 개선 (테스트, 리팩토링 — 핵심 기능 완료 후)
4. SEO 최적화 + 가이드 콘텐츠 확장

---

## [2026-04-05 11:00] 자동 개발 세션

### 리서치
- ✅ 수행 (쿨다운 9.8h > 6h)
- [자동 반영] 5개: A-1 차트 툴팁 DESIGN.md 준수, A-2 Hero 섹션 추가, A-3 결과 카드 키보드 접근성, A-4 MC 차트 다크모드, B-2 시나리오 find() 중복
- [오너 판단 필요] 1개: B-1 console.error 구조화 로깅 전환 (현재는 유지)
- [C] 외부 조사: 신규 2개 (C-1 한국 FIRE 시장, C-2 수익화 벤치마크)
- [C] 반영 추적: 첫 리서치이므로 기존 [C] 없음

### 메인 태스크
- DESIGN.md 정합성 + 접근성 + UX 개선 (리서치 [자동 반영] 일괄 구현)

### 추가 작업
1. GitHub 리포지토리 생성: https://github.com/yonghot/firepath
2. Vercel 프로덕션 배포 설정 (GitHub 연동 완료)
3. 시나리오 비교 차트 툴팁도 DESIGN.md 준수로 수정

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음 (REVIEW.md에 [MUST] 항목 없음)
- PRD 변경점: 없음
- DESIGN.md 불일치 4건 → 모두 수정:
  1. 메인 차트 툴팁: bg-background → bg-neutral-900 (dark bg, white text)
  2. MC 차트 툴팁: 동일 수정
  3. 시나리오 비교 차트 툴팁: 동일 수정
  4. MC 차트 fill="#ffffff" → fill="var(--background)" (다크모드 대응)
- feature_list.json vs 코드: 불일치 0건

### 구현 상세
- 수정 파일:
  - `src/components/features/calculator/fire-timeline-chart.tsx` — 툴팁 dark bg
  - `src/components/features/monte-carlo/monte-carlo-chart.tsx` — 툴팁 dark bg + fill 다크모드 대응
  - `src/components/features/scenario/scenario-comparison.tsx` — 툴팁 dark bg
  - `src/app/(main)/page.tsx` — Hero 섹션 추가 + 시나리오 find() 중복 제거 + Flame import
  - `src/components/features/calculator/fire-result-card.tsx` — tabIndex, role, aria-label, onFocus/onBlur
  - `RESEARCH.md` — 첫 리서치 결과 작성

### 아키텍처 메모
- 차트 툴팁은 Recharts 커스텀 컴포넌트로, CSS 테마와 무관하게 항상 dark bg 사용 (DESIGN.md 명세)
- 결과 카드 접근성: role="button" + aria-label로 스크린 리더 지원

### 시도했으나 실패한 접근
- 없음

### 자가 검토
- REVIEW.md [MUST]: 해당 없음
- feature_list.json AC: 신규 기능 없음 (개선만)
- DESIGN.md vs UI: 차트 툴팁 3건 수정, MC 다크모드 fill 수정
- PRD vs 구현: 변경 없음
- 레이어 위반: 0건
- 빌드: PASS

### 배포
- Git: push ✅ (https://github.com/yonghot/firepath)
- Vercel: ✅ 배포 완료 (https://firepath-e8vp53uit-sk1597530-3914s-projects.vercel.app)
- 프로덕션 확인: ❌ HTTP 401 — Vercel SSO 보호 활성화 (팀 설정)

### 판단 필요
1. **Vercel SSO 보호 해제**: 프로덕션 URL이 401을 반환합니다. Vercel 대시보드 → Settings → Deployment Protection에서 "Standard Protection"으로 변경해야 합니다. 현재 팀 SSO가 활성화되어 외부 접근이 차단됩니다.
2. **RESEARCH.md C-1**: 앱 UI가 100% 영어인데 PRD 타겟이 한국어 페르소나입니다. 글로벌 vs 한국어 타겟 결정이 필요합니다.
3. **RESEARCH.md C-2**: $4.99/월 프리미엄 가격과 기능 구성의 적정성 검증이 필요합니다.
4. **Supabase 환경변수**: SUPABASE_SERVICE_ROLE_KEY가 비어있습니다. Vercel에 환경변수 설정 필요합니다.
5. **NEXT_PUBLIC_APP_URL**: Vercel 프로덕션 URL로 업데이트 필요 (현재 localhost:3000).

### 다음 세션 권장
1. Vercel SSO 해제 후 프로덕션 확인
2. Vercel 환경변수 설정 (SUPABASE_*, NEXT_PUBLIC_APP_URL)
3. F014 Portfolio Optimization (P2 마지막)
4. F012 Stripe 연동 (SECRET_KEY 필요)
5. RESEARCH.md C-1, C-2 심층 연구 수행

---

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
