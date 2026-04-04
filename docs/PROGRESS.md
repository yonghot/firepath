# PROGRESS.md

## 현재 상태
- 현재 Phase: P1 기능 완성 + PWA
- 마지막 업데이트: 2026-04-05
- 상태: P0 완전 완료, P1 5/5 완료, P2 1/3 partial

## [2026-04-05 02:45] 자동 개발 세션

### 리서치
- ⏭️ 스킵 (쿨다운 미경과, 1.6h < 6h)

### 정합성 검증 (B-0.5)
- [MUST] 위반: 없음 (REVIEW.md에 [MUST] 항목 없음)
- PRD 변경점: `/api/subscriptions/portal` 라우트 누락 → 생성 완료
- DESIGN.md 불일치 2건:
  - FIRE 카드 shadow 순서 뒤바뀜 (none→sm → sm→md로 수정)
  - h2 heading weight semibold→bold 수정 (DESIGN.md: h1/h2 = 700)
- 레이어 위반: 0건

### 메인 태스크
- F011 Scenario Comparison (skip → pass)
  - 시나리오 저장/비교 기능 구현 (클라이언트 사이드)
  - 무료 2개 제한, 이름 지정, 현재 입력값 스냅샷
  - 비교 뷰: 타임라인 오버레이 차트 + FIRE 타입별 비교 테이블
  - 차이값 표시 (emerald=유리, red=불리)

### 추가 작업
1. `/api/subscriptions/portal/route.ts` 생성 (PRD 누락 보완)
2. DESIGN.md 카드 shadow 수정 (sm default → md hover)
3. h2 heading font-weight 수정 (semibold → bold)
4. PWA 지원 (F015 신규):
   - `public/manifest.webmanifest` 생성
   - SVG 아이콘 생성
   - 루트 레이아웃에 manifest, themeColor, appleWebApp 메타데이터 추가

### 구현 상세
- 생성 파일:
  - `src/stores/scenario.store.ts` — Zustand 시나리오 상태 관리
  - `src/components/features/scenario/scenario-manager.tsx` — 시나리오 저장/삭제 UI
  - `src/components/features/scenario/scenario-comparison.tsx` — 비교 차트+테이블
  - `src/app/api/subscriptions/portal/route.ts` — 구독 포탈 API
  - `public/manifest.webmanifest` — PWA 매니페스트
  - `public/icons/icon.svg` — 앱 아이콘
- 수정 파일:
  - `src/app/(main)/page.tsx` — 시나리오 매니저/비교 뷰 통합
  - `src/components/features/calculator/fire-result-card.tsx` — shadow 수정
  - `src/components/features/calculator/calculator-panel.tsx` — h2 font-weight
  - `src/app/layout.tsx` — PWA 메타데이터
  - `src/types/fire.types.ts` — Scenario 인터페이스 추가
  - `feature_list.json` — F011 pass, F015 추가

### 아키텍처 메모
- 시나리오는 클라이언트 전용 (Zustand). 서버 저장 불필요 (anonymous/free는 2개 제한)
- 프리미엄 무제한 시나리오는 Stripe 연동 후 서버 저장으로 확장 예정

### 자가 검토
- REVIEW.md [MUST]: 해당 없음
- feature_list.json AC: F011 pass 확인
- DESIGN.md vs UI: shadow 수정 완료, typography 수정 완료
- PRD vs 구현: portal route 추가로 모든 API 엔드포인트 일치
- 레이어 위반: 0건 확인 (서브에이전트 검증)
- 빌드: PASS

### 배포
- Git: commit ✅ (50df424), push ❌ (git remote 미설정)
- 프로덕션: ❌ (Vercel 미설정, git remote 없음)

### 판단 필요
- git remote가 설정되어 있지 않습니다. GitHub 리포지토리를 생성하고 `git remote add origin <URL>` 실행 필요.
- Vercel 배포 설정이 없습니다. `npx vercel` 초기 설정 또는 GitHub 연동 필요.

### 다음 세션 권장
1. RESEARCH.md 리서치 수행 (쿨다운 경과 후)
2. F012 Stripe 연동 (SECRET_KEY 환경변수 필요)
3. F013 Monte Carlo Simulation (P2)
4. 프리미엄 시나리오 무제한 (서버 저장 확장)
5. E2E 테스트 (Playwright)

---

## 이전 세션 아카이브

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

## 미해결 이슈
1. [ ] Stripe Secret Key + Webhook 연동
2. [ ] Google OAuth provider 활성화 (Supabase dashboard)
3. [ ] SUPABASE_SERVICE_ROLE_KEY 설정
4. [ ] 시나리오 프리미엄 무제한 (서버 저장)
5. [ ] 몬테카를로 시뮬레이션 (F013)
6. [ ] Vercel 배포 + 커스텀 도메인
7. [ ] E2E 테스트 (Playwright)
8. [ ] seed 자격증명을 환경변수로 이동

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
