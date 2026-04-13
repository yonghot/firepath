# FIREPath — Research Notes

---

**리서치 일시**: 2026-04-13 14:30 KST
**코드베이스 상태**: 완료 15/16 (F012 partial — Stripe), 빌드 PASS, 코드 품질 양호 (console.log 0, any 0, 300줄+ 0, TODO 0)

## [A] 방향/기능 제안 (신규)

### A-12: Guide 마크다운 렌더러 개선 [자동 반영]
- 현재 상태: guide/[slug]/page.tsx의 renderGuideContent()가 라인별 문자열 처리로 HTML 생성. `<li>` 태그가 `<ul>` 래퍼 없이 출력 (무효 HTML). 링크/볼드/이탤릭/코드 미지원. tailwindcss/typography 미설치로 prose 클래스 미적용.
- 제안: react-markdown + remark-gfm 도입 또는 최소한 renderGuideContent() 내에서 `<ul>` 래핑 + 기본 인라인 마크다운 (bold, italic, link) 지원
- 근거: PROGRESS.md 잔여 기술 부채 + SEO 콘텐츠 품질 (구조적 HTML이 검색 엔진 파싱에 유리)
- 구현 가이드: 의존성 최소화를 위해 react-markdown 대신 renderGuideContent() 자체 개선 (li→ul 래핑, [text](url)→a 태그, **bold**→strong, *italic*→em)
- 예상 작업량: 30분
- 부작용: 없음 (기존 콘텐츠 호환)

### A-13: FAQ 섹션 + FAQ JSON-LD [자동 반영]
- 현재 상태: FAQ 콘텐츠 없음. 구글 FAQ rich snippet 미활용.
- 제안: 홈 또는 /guide 페이지에 FIRE FAQ 5-8개 추가 + FAQPage JSON-LD
- 근거: PROGRESS.md "다음 세션 권장" 3번. FAQ rich snippet은 SERP CTR 개선에 효과적.
- 구현 가이드: 홈 하단에 Accordion FAQ 섹션 + script JSON-LD. 질문은 FIRE 초보자 관점.
- 예상 작업량: 40분
- 부작용: 없음

### A-14: FIRE 엔진 단위 테스트 [자동 반영]
- 현재 상태: fire-calculator.ts, monte-carlo.ts, portfolio-optimizer.ts 모두 순수 함수이나 테스트 없음
- 제안: vitest로 핵심 계산 로직 단위 테스트 작성
- 근거: PROGRESS.md "다음 세션 권장" 5번. 순수 함수라 테스트 용이. 회귀 방지 효과 높음.
- 구현 가이드: vitest 설치 + src/lib/engine/__tests__/ 하위에 테스트 파일 생성
- 예상 작업량: 45분
- 부작용: devDependency 추가

## 반영 현황 (이전 리서치)
- A-1~A-4: 전부 [반영] 완료
- A-5~A-8: 전부 [반영] 완료
- A-9~A-11: 전부 [반영] 완료
- B-1: [오너 판단 필요] 유지
- B-2: [반영] 완료
- B-3, B-4: A-9, A-10으로 승격 후 [반영] 완료
- C-1, C-2, C-3: [오너 판단 필요] 유지

---

**리서치 일시**: 2026-04-11 16:55 KST
**코드베이스 상태**: 완료 15/16 (F012 partial — Stripe), 빌드 PASS

## [A] 방향/기능 제안 (신규)

### A-9: 가이드 3-Layer 아키텍처 준수 [자동 반영]
- 현재 상태: guide/[slug]/page.tsx + guide/page.tsx가 GuideRepository 직접 호출 (CLAUDE.md의 3-Layer 규칙 위반)
- 제안: src/lib/services/guide.service.ts 생성, 페이지는 서비스만 호출
- 근거: CLAUDE.md "3-Layer: API Route → Service → Repository (직접 DB 접근 금지)" + RESEARCH.md B-3
- 구현 가이드: GuideService에 getBySlug, listAll 메소드. 빌드 타임 fallback 처리 포함.
- 예상 작업량: 20분
- 부작용: 없음 (기존 에러 폴백 유지)

### A-10: Repository 에러 AppError 래핑 [자동 반영]
- 현재 상태: 모든 Repository가 Supabase raw error를 throw. 내부 DB 스키마/코드가 handleApiError 로그에 노출
- 제안: DB_ERROR 에러 코드 추가 + 각 Repository에서 AppError로 래핑
- 근거: RESEARCH.md B-4, 구조화된 에러 로깅 표준화
- 구현 가이드: error-codes.ts에 DB_ERROR 추가, repository에서 `throw new AppError('DB_ERROR', error.message)` 패턴
- 예상 작업량: 25분
- 부작용: 없음 (기존 처리 유지, 상위 레이어는 그대로 동작)

### A-11: PortfolioPanel 컴포넌트 분리 [자동 반영]
- 현재 상태: portfolio-panel.tsx 198줄, JSX 블록 5개가 한 파일에 혼재
- 제안: profile-selector, metrics-card 하위 컴포넌트 분리 — 수정 시 Refactor-on-Touch 원칙 적용
- 근거: 가독성 + 테스트 용이성. (PROGRESS.md 기술 부채 잔여)
- 예상 작업량: 20분
- 부작용: 없음 (순수 렌더링 리팩토링)

## [B] 코드 개선 (업데이트)
- B-3 (Guide 서비스 레이어 바이패스) → A-9에서 승격 [자동 반영]
- B-4 (Repository AppError 래핑) → A-10에서 승격 [자동 반영]

---

**리서치 일시**: 2026-04-08 19:25 KST
**코드베이스 상태**: 완료 15/16 (F012 partial — Stripe), 빌드 PASS

## [A] 방향/기능 제안

### A-5: Premium 버튼 dead-end 수정 [자동 반영]
- 현재 상태: `/premium` 페이지의 "Get Premium" 버튼에 onClick/href가 없어 아무 동작 안 함
- 제안: Stripe 미연동 상태에서도 "Coming Soon" 또는 이메일 수집 CTA로 전환
- 근거: R1-1 사용자 플로우 분석에서 premium 전환 경로가 dead-end
- 구현 가이드: premium/page.tsx 버튼에 적절한 상태 표시
- 예상 작업량: 15분
- 부작용: 없음

### A-6: 시나리오 데이터 새로고침 시 유실 방지 [자동 반영]
- 현재 상태: 시나리오가 Zustand 메모리 스토어에만 저장되어 페이지 새로고침 시 전부 유실
- 제안: Zustand persist middleware + localStorage로 시나리오 영속화
- 근거: R1-1 사용자 플로우 분석 — 사용자가 시나리오 2개 저장 후 새로고침하면 모두 사라짐
- 구현 가이드: scenario.store.ts에 persist middleware 추가
- 예상 작업량: 15분
- 부작용: 없음

### A-7: 가이드 인덱스 페이지 + generateStaticParams 추가 [자동 반영]
- 현재 상태: /guide/[slug] 개별 페이지만 존재. 가이드 목록 페이지 없음. SSG 미적용.
- 제안: /guide 인덱스 페이지 생성 + generateStaticParams로 빌드 시 정적 생성
- 근거: PRD 2-7에서 Guide는 "SC" 타입. SEO에 중요. R1-5 분석에서 SSG 미적용 확인.
- 구현 가이드: src/app/(main)/guide/page.tsx 인덱스 + [slug]/page.tsx에 generateStaticParams
- 예상 작업량: 30분
- 부작용: 없음 (Supabase 연결 필요하므로 빌드 시 DB 접근 가능해야 함)

### A-8: Calculator Panel 헤딩 DESIGN.md 정합성 [자동 반영]
- 현재 상태: calculator-panel.tsx의 "Parameters" h2가 text-lg (18px), scenario-manager.tsx의 "Scenarios" h3가 text-sm (14px)
- 제안: DESIGN.md 스케일에 맞춤 — h2는 최소 text-xl, h3는 text-base 이상
- 근거: R1-2 디자인 감사에서 DESIGN.md 타이포그래피 스케일 위반 확인
- 구현 가이드: calculator-panel.tsx h2 → text-xl font-semibold, scenario-manager.tsx h3 → text-base font-semibold
- 예상 작업량: 5분
- 부작용: 없음

## [B] 코드 개선

### B-3: Guide 페이지 서비스 레이어 바이패스 [오너 판단 필요]
- 대상 파일: src/app/(main)/guide/[slug]/page.tsx
- 문제: Server Component가 GuideRepository를 직접 호출 (서비스 레이어 없음)
- 제안: guide.service.ts 생성하여 3-Layer 준수
- 위험도: 낮음 (읽기 전용 공개 콘텐츠)

### B-4: Repository 에러를 AppError로 래핑 [오너 판단 필요]
- 대상 파일: src/lib/repositories/ 내 모든 파일
- 문제: Supabase 에러를 raw로 throw하여 500 응답 시 내부 DB 상세가 로깅될 수 있음
- 제안: Repository 에러를 AppError로 래핑하여 구조화된 에러 처리
- 위험도: 낮음 (현재 서버 사이드에서만 로깅, 클라이언트 노출 없음)

## [C] 외부 조사

[C] 작성 전 기존 항목 확인:
- C-1 (한국 FIRE 커뮤니티): PRD.md 변경 없음 → [미반영 — 오너 확인 대기]
- C-2 (수익화 벤치마크): PRD.md 변경 없음 → [미반영 — 오너 확인 대기]

### C-3: FIRE 계산기 SEO 키워드 전략
- 배경: 가이드 콘텐츠가 Supabase DB에만 존재하고, 빌드 시 정적 생성되지 않음. SEO 효과 미미.
- 내부 분석 결과: 5개 가이드 토픽은 seeded 데이터로만 존재. 타겟 키워드, 검색 볼륨 분석 없음.
- 추가로 필요한 것: FIRE 관련 롱테일 키워드 목록, 검색 볼륨, 경쟁 도구의 SEO 전략
- 질문: "FIRE(Financial Independence Retire Early) 계산기의 SEO 전략을 조사해주세요: 1) FIRE 관련 검색 키워드 목록과 월간 검색 볼륨 (영어), 2) 상위 FIRE 계산기들의 콘텐츠 전략 (어떤 가이드/블로그를 제공하는지), 3) 'FIRE calculator', 'retirement calculator' 등 핵심 키워드의 경쟁 강도, 4) 롱테일 키워드로 진입 가능한 틈새 주제"
- 결과 반영: PRD.md 2-7 Pages + guides 콘텐츠 전략
- 긴급도: 중간

## [D] 시장 인사이트

### D-3: FIRE 계산기의 핵심 차별화는 "비교"
- 발견: cFIREsim, FICalc 등은 단일 시나리오 중심. FIREPath의 5 FIRE 유형 동시 비교는 시장에서 고유함.
- 적용 가능성: 이 차별점을 Hero 섹션, OG 이미지, 메타 설명에 더 강조
- 관련 기능: F009 OG Image, SEO meta descriptions

### D-4: 개인 금융 SaaS의 freemium 전환
- 발견: 개인 금융 도구의 무료→유료 전환율은 통상 2-5%. FIRE 계산기는 일회성 사용 경향이 강해 구독 유지가 어려움.
- 적용 가능성: 프리미엄 모델 대신 일회성 결제 또는 평생 액세스 검토 필요 (C-2 심층 연구 대기 중)

## [E] 개발 효율화

### E-3: Vercel SSO 보호가 여전히 프로덕션 접근 차단
- 관찰: 4+ 세션 연속으로 프로덕션 URL이 401 반환
- 제안: Vercel 대시보드 → Settings → Deployment Protection → "Standard Protection"으로 변경
- 기대 효과: 프로덕션 URL 공개 접근 가능

### E-4: Supabase 환경변수 미설정으로 서버 기능 불완전
- 관찰: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL 미설정
- 제안: Vercel 환경변수 설정 필요 (오너 작업)
- 기대 효과: 서버 사이드 Supabase 기능 정상 작동

---

**리서치 일시**: 2026-04-05 11:00 KST
**코드베이스 상태**: 완료 14/16 (F012 partial, F014 skip), 빌드 PASS

## [A] 방향/기능 제안

### A-1: 차트 툴팁 DESIGN.md 준수 [자동 반영]
- 현재 상태: `fire-timeline-chart.tsx` 툴팁이 `bg-background/95 backdrop-blur` 사용 (라이트 모드에서 흰 배경)
- 제안: DESIGN.md 명세 "dark bg, white text, font-mono for values"에 맞게 `bg-neutral-900 text-white` 적용
- 근거: DESIGN.md Chart > Tooltip 명세 직접 위반
- 구현 가이드: ChartTooltipContent의 className 수정
- 예상 작업량: 5분
- 부작용: 없음

### A-2: 메인 페이지 Hero/CTA 부재 [자동 반영]
- 현재 상태: 랜딩 페이지가 즉시 계산기로 시작. 앱의 가치를 설명하는 헤드라인이나 설명 없음
- 제안: 계산기 위에 간결한 1줄 헤드라인 + 부제 추가 (예: "Plan Your Path to Financial Independence")
- 근거: 신규 사용자의 FTUE 개선. PRD 2-2 타겟 "FIRE 탐색자"가 서비스 목적을 즉시 이해할 수 있어야 함
- 구현 가이드: page.tsx 상단에 h1 + p 추가, DESIGN.md 타이포그래피 스케일 적용
- 예상 작업량: 15분
- 부작용: 없음

### A-3: 결과 카드 접근성 — 키보드 포커스 [자동 반영]
- 현재 상태: 결과 카드가 `cursor-pointer`와 `onMouseEnter/Leave`만 있고, 키보드 포커스/활성화 없음
- 제안: `tabIndex={0}`, `onFocus/onBlur` 추가, `role="button"` 또는 적절한 ARIA
- 근거: DESIGN.md Accessibility "full tab navigation through all interactive elements", PRD 2-10 WCAG 2.1 AA
- 구현 가이드: fire-result-card.tsx에 tabIndex, onFocus, onBlur, onKeyDown(Enter/Space) 추가
- 예상 작업량: 15분
- 부작용: 없음

### A-4: 몬테카를로 차트 다크모드 색상 대비 확인 [자동 반영]
- 현재 상태: monte-carlo-chart.tsx의 팬 차트가 다크모드에서 배경과 대비 부족할 수 있음
- 제안: 다크모드에서 퍼센타일 영역의 opacity/색상 확인 및 조정
- 근거: DESIGN.md Dark Mode "maintain contrast ratios"
- 구현 가이드: 차트 컴포넌트 리뷰 후 필요시 opacity 조정
- 예상 작업량: 20분
- 부작용: 없음

## [B] 코드 개선

### B-1: console.error를 구조화된 로깅으로 개선 [오너 판단 필요]
- 대상 파일: src/app/api/ 내 7개 console.error
- 문제: console.error는 프로덕션에서 구조화되지 않은 로그를 생성
- 제안: 현재 단계에서는 유지 (Vercel 로그로 충분). 프로덕션 트래픽 증가 시 구조화된 로거로 전환
- 위험도: 낮음 (현재 console.error는 catch 블록 내에서만 사용, 보안 정보 누출 없음)

### B-2: 시나리오 비교 find() 중복 호출 [자동 반영]
- 대상 파일: src/app/(main)/page.tsx:30-41
- 문제: `scenarios.find()` 동일 조건으로 4회 호출 (검증 2회 + 실제 사용 2회)
- 제안: find 결과를 변수에 저장하여 재사용
- 위험도: 없음 (순수 리팩토링, 동작 변경 없음)

## [C] 외부 조사

[C] 작성 전 기존 항목 확인: RESEARCH.md에 기존 [C] 항목 없음 (첫 리서치).

### C-1: 한국 FIRE 커뮤니티 현황 및 타겟 검증
- 배경: PRD 2-2에서 타겟이 한국어 페르소나명 (FIRE 추구자, 탐색자)이나, 앱 UI는 100% 영어. 한국 시장 vs 글로벌 시장 결정 필요.
- 내부 분석 결과: 기본값이 USD ($80K 소득, $40K 지출, 7% 수익률)로 미국 시장 기준. 한국 시장이면 KRW 기본값, 한국 수익률(KOSPI 평균), 한국 물가상승률 필요.
- 추가로 필요한 것: 한국 FIRE 커뮤니티 규모, 경쟁 도구(뱅크샐러드, 토스 등의 FIRE 기능), 한국 FIRE 유형별 인지도
- 질문: "한국 FIRE(파이어족) 커뮤니티 현황을 조사해주세요: 1) 주요 커뮤니티 규모 (네이버 카페, 디시 등), 2) 경쟁 FIRE 계산기 도구 목록 (뱅크샐러드/토스/기타), 3) 한국 FIRE 유형별 인지도 (LeanFIRE, CoastFIRE 등이 한국에서 쓰이는지), 4) 글로벌(영어) vs 한국어 타겟 중 어느 쪽이 유리한지 분석"
- 결과 반영: PRD.md 2-2 Target Users + 2-8 기본값 + 전체 i18n 전략
- 긴급도: 높음 (앱 언어와 기본값이 타겟에 따라 완전히 달라짐)

### C-2: FIRE 계산기 수익화 전략 벤치마크
- 배경: PRD.md에 $4.99/월 프리미엄 구독이 있으나, FIRE 계산기 시장에서 이 가격대와 기능 구성이 적절한지 검증 필요.
- 내부 분석 결과: 프리미엄 기능으로 Monte Carlo, Portfolio Optimization, 무제한 저장, 무제한 시나리오 제공. cFIREsim, FICalc 등 무료 도구가 Monte Carlo를 이미 제공.
- 추가로 필요한 것: 유료 FIRE 도구의 가격 비교, 차별화 포인트, 전환율 벤치마크
- 질문: "FIRE/조기은퇴 계산기의 수익화 전략을 조사해주세요: 1) 유료 FIRE 도구 목록과 가격 (ProjectionLab, Boldin 등), 2) 무료 FIRE 도구와 차별화 포인트, 3) 개인 금융 SaaS의 전환율 벤치마크, 4) $4.99/월 가격대의 적정성 분석"
- 결과 반영: PRD.md 2-9 Permission Matrix + 프리미엄 기능 재구성
- 긴급도: 중간

## [D] 시장 인사이트

### D-1: FIRE 계산기 경쟁 현황
- 발견: 주요 무료 FIRE 계산기 (cFIREsim, FICalc, Empower, NerdWallet FIRE calc)는 모두 Monte Carlo를 무료 제공. FIREPath의 차별점은 5개 FIRE 유형 동시 비교 + 인터랙티브 타임라인.
- 적용 가능성: 5가지 FIRE 유형 동시 비교를 마케팅 핵심 메시지로 강화
- 관련 기능: 메인 페이지 Hero 섹션, OG 이미지, SEO 가이드

### D-2: 개인 금융 도구 FTUE 패턴
- 발견: 성공적인 계산기 도구들은 "즉시 결과 → 가치 확인 → 가입 유도" 패턴 사용. 입력 없이 기본값으로 결과를 먼저 보여주는 것이 핵심.
- 적용 가능성: FIREPath는 이미 기본값으로 즉시 결과 표시 → 좋은 FTUE. Hero 텍스트 추가로 더 강화 가능.

## [E] 개발 효율화

### E-1: git remote + 배포 파이프라인 없음 — 모든 작업의 블로커
- 관찰: 4개 세션 연속으로 "git push ❌", "프로덕션 ❌" 기록. 코드가 로컬에만 존재.
- 제안: 오너가 GitHub repo 생성 + git remote add origin 실행해야 함. 이후 Vercel 연동.
- 기대 효과: 자동 세션이 매번 배포까지 완료 가능

### E-2: 시나리오 비교에서 불필요한 이중 find()
- 관찰: page.tsx에서 scenarios.find()를 4번 호출 (B-2와 동일)
- 제안: useMemo 또는 변수 캐싱으로 2회로 줄임
- 기대 효과: 미미한 성능 개선, 코드 가독성 향상
