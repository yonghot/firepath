# FIREPath — Research Notes

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
