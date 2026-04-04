# PROGRESS.md

## 현재 상태
- 현재 Phase: Phase 5 (완료)
- 마지막 업데이트: 2026-04-05
- 상태: 프로토타입 초안 완성

## 완료된 Phase

### Phase 0: 하네스 구축 ✅
- CLAUDE.md, PRD.md, DESIGN.md, REVIEW.md, RESEARCH.md
- .claude/settings.json + 4 hooks
- src/api/CLAUDE.md, src/components/CLAUDE.md
- 8 agents, feature_list.json, PROGRESS.md

### Phase 1: PRD 분석 + 아키텍처 + 프로젝트 초기화 ✅
- docs/prd-analysis.md — P0 6개, P1 5개, P2 3개 기능 분석
- docs/architecture.md — 3-layer, 데이터 모델, 컴포넌트 트리
- Next.js 14+ (App Router) + shadcn/ui + Tailwind 초기화
- Supabase 프로젝트 생성 (cvlbdeaattcloitjvkvw)

### Phase 2: 백엔드 구현 ✅
- DB 스키마: profiles, saved_calculations, subscriptions, guides (RLS)
- 시드 데이터: 5개 FIRE 가이드
- Repository 3개: Calculation, Profile, Subscription, Guide
- Service 2개: Calculation (5개 제한 로직), Subscription
- API Routes: /api/calculations (CRUD), /api/subscriptions, /api/auth/callback, /api/og

### Phase 3: 프론트엔드 구현 ✅
- FIRE 계산 엔진 (순수 함수, 클라이언트 사이드)
- Zustand 스토어 + URL 해시 양방향 동기화
- 9개 슬라이더 패널 (shadcn/ui Slider + Input)
- Recharts 타임라인 차트 (5개 FIRE 목표선 + 달성 마커)
- 5개 FIRE 결과 카드
- 인증 페이지 (login/signup + Google OAuth)
- 저장된 계산 목록 (React Query + 삭제)
- 프리미엄 안내 (Free vs Premium 비교)
- 가이드 페이지 (SSG, Markdown 렌더링)
- OG 이미지 API (@vercel/og)
- 반응형 (모바일 Sheet + 데스크톱 Sidebar)

### Phase 4: 통합 + QA ✅
- 전체 빌드 성공 (pnpm build)
- 12개 라우트 정상 등록
- 모바일/데스크톱 레이아웃 검증
- 차트 실시간 갱신 확인
- FIRE 계산 검증: Regular=$1M, Lean=$600K, Fat=$1.5M (기본값)

### Phase 5: 문서 + 최종 ✅
- PROGRESS.md 최종 업데이트
- feature_list.json 상태 반영

## 핵심 결정
1. shadcn/ui v4 (base-ui 기반) — asChild 없음, 직접 className 적용
2. Zod v4 사용 (import from 'zod/v4')
3. Recharts v3 — ResponsiveContainer + AreaChart
4. 차트 레이블 제거 — 카드 색상으로 FIRE 유형 식별
5. Supabase 프로젝트: cvlbdeaattcloitjvkvw (us-east-1)

## 실패한 접근법
1. `asChild` prop — shadcn/ui v4 (base-ui)에서 제거됨. 직접 스타일링으로 전환
2. Slider `onValueChange` — base-ui는 `readonly number[]` 타입. 타입 추론으로 해결

## 미해결 이슈
1. Stripe 연동 미완 (Secret key 미설정) — 프리미엄 결제는 placeholder
2. Google OAuth — Supabase 대시보드에서 provider 활성화 필요
3. PWA (next-pwa) 미설정 — manifest.json, sw.js 필요
4. 차트 X축 끝 잘림 — 1440px에서 80세까지 표시 시 약간 잘림
5. SUPABASE_SERVICE_ROLE_KEY 미설정

## 다음 작업 후보
1. Stripe 통합 완성 (Secret key + Webhook)
2. Google OAuth provider 활성화
3. PWA 설정 (manifest + service worker)
4. 몬테카를로 시뮬레이션 (P2)
5. E2E 테스트 (Playwright)
6. Vercel 배포
