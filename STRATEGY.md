# 5개 사이트 — 구글 애드센스 수익 극대화 & 마케팅 전략 총정리 보고서

> **최종 갱신**: 2026-06-28
> **대상**: 미국 타깃 "비용 계산기(cost calculator)" 5개 사이트 (Vercel/Next.js, 단독 운영, 무광고예산)
> **AdSense 게시자 ID**: `ca-pub-1378312299412437`
> **근거**: 2026년 최신 웹 리서치 8개 차원(출처 100+개) + 위험 주장 적대적 교차검증, 그리고 현재 코드/인프라 구현 현황

| # | 도메인 | 성격 | 1차 수익모델 |
|---|---|---|---|
| 1 | **launchcostcalc.com** | 스타트업 창업비용 계산기 (B2B/창업자) | AdSense + 제휴(법인설립/회계) |
| 2 | **gofirepath.com** (FIREPath) | FIRE/조기은퇴 계산기 (개인금융) | 프리미엄($4.99/mo, ad-free) + AdSense(무료티어) |
| 3 | **saascostx.com** | B2B SaaS 비용/요금 계산기 | AdSense + Pro 구독($9.99/mo) |
| 4 | **legalcostcalc.co** | 법률 비용 계산기 (YMYL·법률) | 제휴/리드젠 1차 + AdSense 2차 |
| 5 | **dentalcostfinder.co** | 치과 시술 비용 파인더 (YMYL·헬스) | AdSense 1차 + 치과보험 제휴 |

---

## 0. 핵심 전략 요약 (TL;DR)

1. **제로 트래픽 단계의 진짜 레버는 "광고 최적화"가 아니라 "트래픽"이다.** 광고 튜닝은 방문자가 있어야 의미가 있다. 지금은 ① 광고/계정을 *처음부터 올바르게* 세팅하고 ② 무료 채널로 트래픽을 키우는 데 집중한다.
2. **raw 애드센스 RPM의 현실은 약 $1~3 CPM(= 1,000뷰당 $3~9)** 이다. 흔히 떠도는 $25~80 RPM은 트래픽을 키워 **프리미엄 네트워크(Mediavine/Raptive)** 로 전환했을 때의 수치다.
3. **돈을 따라가라**: 콘텐츠 투입 우선순위 = 법률 > 치과 > 금융(FIRE) > SaaS/스타트업. B2B 2사는 디스플레이보다 **제휴/리드젠**이 더 맞는다.
4. **계산기는 AI Overviews가 복제 못 하는 해자(moat)** 다. 정보성 글 CTR은 AIO로 ~37% 깎였지만 인터랙티브 툴은 안 뺏긴다.
5. **최대 실존 위험 = 얇은 양산(scaled-content) 페이지.** 고유 데이터 + E-E-A-T가 없으면 SEO 페널티 + 애드센스 "광고 제한"으로 수익이 조용히 0이 된다. (특히 YMYL 법률·치과)
6. **무료 마케팅 3대 축**: ① 임베드 위젯(복리형 백링크) ② 데이터 PR("발견 먼저") ③ Pinterest + Quora.

---

## Part 1. 현재 5개 사이트 공통 적용 현황 (구현 완료)

이미 코드/인프라/대시보드에 적용되어 **공통적으로 작동 중**인 항목.

### 1.1 애드센스 기반
- **게시자 ID 표준화**: `ca-pub-1378312299412437` 를 5개 Vercel 프로젝트 전부 `NEXT_PUBLIC_ADSENSE_CLIENT_ID` 환경변수로 통일(prod/preview/dev).
- **`ads.txt`**: 각 도메인이 `google.com, pub-1378312299412437, DIRECT, f08c47fec0942fa0` 한 줄을 환경변수 기반으로 서빙.
- **소유권 확인 메타**: `<meta name="google-adsense-account" content="ca-pub-1378312299412437">` 무조건 출력.
- **사이트 등록·승인**: 5개 도메인 AdSense 대시보드 등록(계정 `cio@actigence.ai`).
- **Auto Ads ON (5개 전부)**: 오버레이(앵커+비네트+사이드레일) + 인페이지 기본값. ※ actigence.ai(본업 사이트)는 의도적으로 제외.
- **수동 AdSlot 컴포넌트**: 콘텐츠/결과 페이지에 배치. gofirepath는 `!isPremium` 게이팅(프리미엄=광고 없음).

### 1.2 개인정보/동의 관리(CMP) — **EU·미국 양쪽 규정 커버**
- **지역 차등 동의(geo-differentiated)**: `middleware.ts`가 `x-vercel-ip-country`를 읽어 쿠키 설정 → 비EEA는 즉시 동의 부여, EEA/영국/스위스는 옵트인 대기.
- **Consent Mode v2**: `<head>`에 기본값 전부 denied + `wait_for_update:500` 인라인.
- **Google 인증 CMP 게시(완료)**:
  - **GDPR 메시지 "GDPR - All Sites" → 게시됨** (5개 사이트, 거부 버튼을 EEA/영국/스위스 전 국가에 표시, 동의 메시지 최적화 ON).
  - **CCPA 메시지 "CCPA - All Sites" → 게시됨** (5개 사이트, "Do Not Sell or Share My Personal Information" 옵트아웃, en-US).
  - **사이트별 로고**: Higgsfield로 생성(벡터, 텍스트 또렷)해 AdSense 사이트 레지스트리에 5개 전부 등록 + 각 repo `public/logo.png`(+`logo.svg`) 저장.
- 1차 쿠키 배너(분석 게이팅) + 개인정보처리방침/이용약관 페이지 + 푸터 링크.

### 1.3 분석(GA4)
- 계정 "Cost Calculators"(google 계정 `yongho.kim@jnckorea.info`), 사이트별 데이터 스트림 1개.
- 측정 ID: launch=`G-DTB17L8BBX`, gofirepath=`G-P3M4FHMCCG`, saas=`G-2QC0HNPPD0`, legal=`G-GQC29BN7K7`, dental=`G-090939XYX4`. 동의 후 로드(consent-gated).

### 1.4 성능(Core Web Vitals)
- 광고 슬롯 **min-height 예약**으로 CLS 방지, **IntersectionObserver 지연 로드**, `pagead2.googlesyndication.com` **preconnect**. (Next.js/Vercel의 이미지·폰트·정적생성 기본 이점 활용)

### 1.5 검색 인프라(SEO)
- **Google Search Console**: 5개 도메인 전부 도메인 속성으로 추가, DNS TXT로 소유 확인, **사이트맵 제출**. Bing 포함.

> **요약**: "광고를 띄우고 합법적으로 동의를 받고 분석·색인 기반을 깐" Tier-0가 5개 사이트에 균일하게 적용되어 있다. 다음 단계는 *수익 구조 최적화*와 *트래픽 유입*이다.

---

## Part 2. 애드센스 광고수익 극대화 전략

### 2.1 현실적 기대치 설정 (먼저 눈높이 맞추기)
- raw 애드센스 디스플레이 ≈ **$1~3 CPM (~$3~9 RPM)**. (출처: 본인 AdSense 리포트로만 검증 가능, 모든 블로그 수치는 추정)
- 흔히 인용되는 금융/법률 **$25~80 RPM은 헤더비딩이 있는 프리미엄 네트워크 수치** — raw AdSense에는 해당 안 됨.
- 광고주 **CPC ≠ 게시자 수익**. 게시자는 디스플레이 매출의 약 68% 수령, 그마저 CPC의 일부.
- ⇒ **돈은 "트래픽 × 프리미엄 네트워크 전환"에서 나온다.** 광고 미세조정은 트래픽이 생긴 뒤의 일.

### 2.2 지금 당장 할 무료 세팅 (트래픽 0이어도)
- [ ] **Auto Ads 컨트롤 직접 점검** — 2026.4 Google이 '광고 로드 슬라이더'를 *최대 광고 수 / 광고 간 최소 거리 / 아티클 추가 게재* 3개로 개편. 자동 이전값이 부정확할 수 있으니 **툴 페이지는 최대 3~4개, 간격 넉넉히**로 캡. (과밀 시 모바일 슬롯이 **경고 없이 빈 광고**로 나감)
- [ ] **ads.txt 5개 도메인 "승인됨" 확인** (오타·RESELLER 금지).
- [ ] **세금정보(W-9 또는 W-8BEN) + 지급 주소 제출** — 미제출 시 잔액과 무관하게 지급 차단. ($10에 PIN 우편, $100 지급 임계)
- [ ] **자기 클릭/"내 광고 봐줘" 영구 금지** — 트래픽 0에서는 통계적으로 즉시 적발, 신규계정 복구 거의 불가.
- [ ] **트래픽 구매 금지** — "보장 방문자"=봇=IVT=정지.

### 2.3 계산기 페이지 광고 설계 (핵심 RPM 레버)
- **결과 노출 순간(Calculate 클릭 후 결과 바로 아래)** 에 고가치 반응형 유닛(300×250 / 336×280) 1개 — 가장 의도 높고 정책-안전한 자리.
  - 단 **Calculate 버튼·결과 조작부와 충분히 분리(≈150px) + 'Advertisement' 라벨** → 오클릭 IVT 방지.
- **하이브리드 모델**: 수동 2~3개(결과 아래 + 본문) + Auto Ads('기존 광고 단위 사용' ON).
- **오버레이 무료 활용**: 앵커(유일한 합법 스티키) + 사이드레일(데스크톱) + 비네트(페이지 전환). 모바일 중복만 점검.
- **광고 크기 우선순위**: 300×250 / 336×280 → 728×90 → 300×600(데스크톱 사이드바) → 모바일 320×100. 하단 "관련 계산기"에 Multiplex/네이티브.
- **금지**: Calculate/재계산마다 **광고 새로고침(타이머·프로그램)** = 애드센스 정책 위반(밴 위험). 사용자 페이지 이동만 새 노출로 인정.
- **CWV 안전 슬롯**: 모든 `<ins>`에 브레이크포인트별 `min-height` 예약(이미 적용). AdSense 스크립트 `next/script afterInteractive`, GA `lazyOnload`.

### 2.4 INP·모바일 (인터랙티브 툴 특화)
- 계산기는 입력마다 main-thread 작업 → **INP가 진짜 위험 지표**. 재계산 **디바운스**, 키 입력마다 재계산 금지, 결과 연산 경량화.
- 트래픽의 대부분은 모바일. CLS-안전 **모바일 스티키 앵커** + 결과 인접 인콘텐츠 유닛으로 모바일 RPM 회복.

### 2.5 콘텐츠가 곧 RPM (얇은 페이지 탈피)
- 바 계산기 페이지는 contextual 타깃이 안 잡혀 저RPM. **각 계산기를 실질 콘텐츠로 감싸라**:
  - 2,000+단어 "cost of X" 설명, "X vs Y 비용" 비교, "is X worth it" 결정 페이지, 미국 주/도시 geo 변형.
  - 본문 3~5개 인콘텐츠 유닛(첫 유닛은 문단 2~3 이후, ~300~500단어 간격).
- 이 작업은 **SEO 트래픽 + 프리미엄 네트워크 승인 + RPM**을 동시에 올리는 이중·삼중 ROI.

### 2.6 사이트별 가치 순위 (콘텐츠 투입 우선순위)
| 순위 | 사이트 | 근거 |
|---|---|---|
| 1 | **legalcostcalc.co** | 법률 = 웹 최고 CPC 버티컬. PI/이혼/이민/파산/DUI 등 고단가 |
| 2 | **dentalcostfinder.co** | 치과/헬스 상위. 임플란트·올온4·인비절라인 등 고가 시술 |
| 3 | **gofirepath.com** | FIRE/투자 = 고소득 독자, 브로커리지/로보어드바이저 광고주 |
| 4–5 | saascostx / launchcostcalc | 키워드 CPC↑ but **B2B 디스플레이 전환 약함** → 제휴/리드젠으로 |

### 2.7 계정·정책 안전 (수익을 "잃지 않기")
- **YMYL E-E-A-T**(법률·치과·금융): 실명 저자+자격, "검수: [변호사/치과의사/CFP]", "최종 검토일", 권위 출처 인용, "추정치/전문 조언 아님" 면책, About/Contact/Privacy.
- **양산 페이지 차별화**: 페이지마다 실제 다른 데이터 + 고유 설명 100~150단어. 도시 데이터 없으면 **주 단위 통합 or noindex**. 수천 개 near-duplicate보다 **잘 만든 30~50개**.
- **브랜드 안전성**: YMYL만 일부 민감 카테고리 차단, 금융/법률/보험 고가 카테고리는 ON 유지(경쟁 극대화).
- **주간 5분 점검**: 정책센터 + 트래픽 이상치. RPM/클릭 급등은 즉시 조사.

### 2.8 프리미엄 네트워크 로드맵 (검증된 2026 기준)
| 네트워크 | 가입 기준 (2026, 재확인) | 수익배분 | 비고 |
|---|---|---|---|
| **AdSense** | 지금 | — | 트래픽 성장기까지 5개 모두 유지 |
| **Mediavine Journey** | **월 1,000 세션** | 70% | 최저 진입; Grow 스크립트 **비-WordPress(Vercel) `<head>` 주입 가능** |
| ~~Ezoic~~ | **월 250k MAU 필요(2026.2.19~)** ⚠️ | 90% | *과거 "무최소" 폐지* — 더는 저트래픽 진입로 아님 |
| **Raptive** | **월 25,000 PV** + 도메인 6개월↑ + GA4 + "대부분 페이지 롱폼" | 75%+ | 금융/에버그린 최고가. **롱폼 요건이 순수 계산기엔 장벽** |
| **Mediavine 본진** | **연 광고수익 $5,000** (세션 기준 폐지) | 75%→90% | 고RPM 니치(FIRE)는 적은 트래픽으로 도달 |
| Monumetric / SHE / Setupad | $99·WordPress / 여성라이프 / 100k PV | — | **부적합 → 스킵** |

- **전환 원칙**: 가장 빨리 크는 1개(**gofirepath 추천**)부터 **한 번에 1개씩** 전환, 나머지는 AdSense 유지.
- 임계치는 **신청 시점에 각 네트워크 공식 페이지로 재확인**(2026년에 잦은 변경).
- 고급 옵션: Google Ad Manager + AdSense 백필 + Prebid.js(헤더비딩) — 콘텐츠 게이트 없이 RPM↑ 가능하나 솔로 운영엔 유지비 큼.

---

## Part 3. 마케팅 / 무료 트래픽 전략

### 3.1 SEO — 계산기 = AI 시대의 해자
- **AI Overviews 대응**: 정보성 쿼리는 AIO가 답해 CTR↓(~37%). → "X 계산기 / X 비용 추정" **툴 의도**를 노리고, 주변 글은 간결·사실 위주로 **AI 인용** 유도. (AIO 인용 시 클릭↑, 인용은 더 이상 상위 10위와 직결 안 됨 → 신규 도메인도 기회)
- **양산-콘텐츠 페널티 회피(최우선)**: 페이지별 고유 데이터 + 100~150 고유 단어. (2026.3·6 업데이트가 핵심 위험)
- **E-E-A-T**: 위 2.7과 동일 — YMYL 순위의 최대 잠금 해제.
- **스키마(JSON-LD)**: 모든 계산기 `SoftwareApplication`, Q&A `FAQPage`, 계층 `BreadcrumbList`, 저자 `Person/Organization`. (AI 인용·파싱에 직접 기여)
- **필러+클러스터 + 내부링크**: 사이트당 필러 1~3개, 스포크가 위/옆으로 링크. 각 비용 페이지 상단 **40~60단어 '빠른 답(평균±범위)'** 으로 피처드 스니펫/AIO 노림.
- **쿼리 타깃**: "X calculator", "cost of X", "how much does X cost 2026", "X cost by state". 제목·H2에 정확 쿼리 + 연도/지역 수식어 전치.
- 신규 도메인 → **의미 있는 트래픽까지 3~6개월** 예상. GSC+Bing 주간 점검, 무성과 페이지 분기별 정리.

### 3.2 임베드 위젯 — 복리형 백링크 엔진 (★ 솔로 최적, 이번 달 1순위)
- 각 계산기의 **원클릭 임베드 스니펫**(iframe/JS) + 결과 아래 'Powered by [사이트]' 링크.
- **핵심**: 출처 `<a>`는 **부모 페이지 HTML**에 있어야 SEO 반영(iframe 내부는 무효). nofollow 수용 OK.
- 한 번 만들면 타 블로그가 글에 끼워넣을 때마다 **자동 백링크** = 아웃리치 없이 확장되는 유일한 수단.
- **공용 컴포넌트 1개**로 5개 사이트 배포.

### 3.3 데이터 PR / "발견 먼저(finding-first)"
- 각 계산기 출력을 **인용 가능한 통계로 발행** + 방법론 페이지:
  - launchcostcalc → "2026 미국 스타트업 평균 창업비용 $X"
  - dentalcostfinder → "주별 크라운/임플란트 평균 $Y"
  - legalcostcalc → "평균 LLC 설립비 / 변호사 시간당 요율"
  - saascostx → "직원당 평균 SaaS 지출 $Z"
  - gofirepath → "나이대별 은퇴/FIRE에 필요한 금액"
- **툴이 아니라 '이 숫자'를 기자에게 피칭** → 권위 링크 多.
- **무료 HARO 후속**(2026 부활): **Featured.com · Source of Sources · Qwoted · Help a B2B Writer** — 겹침 ~17%라 **3~4개 동시 모니터링**, 비용/금융/헬스 질의에 사이트 데이터로 답하며 링크.
- 각 사이트 통계의 **연 1회 갱신**으로 같은 스터디를 매년 재활용(새 PR + 재방문 이메일).

### 3.4 디렉터리 · 리스티클 · Product Hunt
- **질 위주 10~15개**(저DA 500개 스팸은 사장됨): AlternativeTo · SaaSHub · BetaList · Indie Hackers · Crunchbase (SaaS/창업 툴).
- **"best free calculators" 리스티클 아웃리치**(dental/legal/FIRE 소비자 툴): 작성자에게 "회원 가입 없는 무료 [니치] 계산기" 제안.
- **Product Hunt**: 사이트당 1회, **화~목 00:01 PT, 30일 사전준비**, 첫 6시간이 순위 결정. **5개를 5주에 분산**(같은 날 금지). FIREPath·launchcostcalc가 친화적.

### 3.5 커뮤니티 (채널 × 사이트 매칭)
| 채널 | 적합 사이트 | 핵심 수칙 |
|---|---|---|
| **Pinterest (1순위)** | 전 사이트(특히 dental·legal·FIRE) | 검색엔진형(631M MAU, 검색 97% 비브랜드), 핀 수개월~수년 지속, **밴 리스크 ≈0**. 계산기당 세로 인포그래픽 핀 3~5개 |
| **Quora** | legal·dental·finance | **링크 없는 양질 답변 15~20개로 신뢰 후** 답변당 맥락 링크 1개. AIO/ChatGPT 인용 유입 |
| **Reddit** | launch·saas(B2B) | 계정 숙성+카르마, **9:1(안전 12~15:1)**, **동일 링크 다중 서브 금지=셰도밴 1순위**. 허용 주간 스레드만(r/SideProject, r/SaaS Show&Tell). 금융·법률·의료 서브는 자기홍보 금지 多 |
| **Show HN / Indie Hackers** | saas·launch | 1회성 스파이크 + 백링크 |
| **LinkedIn 60 / X 40** | B2B 3사 | 비용 벤치마크·스크린샷 주 2~3회(핀/블로그 소재 재활용) |
| **YouTube Shorts** | gofirepath·dental | Google 색인됨 → 검색 깔때기 + 부수입 |
- **효율 팁**: 인포그래픽 1개 제작 → Pinterest·Quora·LinkedIn 동시 재활용(1작업 3채널).

### 3.6 자체 네트워크 + 이메일 루프
- **크로스링크**: 5개 사이트를 'More free cost calculators' 모듈로 **맥락 있게 제한적** 연결(앵커 다양화, 전 페이지 동일 블록 금지 → 링크 스킴 회피).
- **이메일 캡처**(결과 PDF/메일, '2026 비용 리포트', 가격 변동 알림) → 초기 트래픽을 반복 방문자로. **FIREPath $4.99 프리미엄 업셀 리스트를 지금부터 적립.**
- **Wikipedia/포럼 직접 삽입 금지** — 되돌려지고 COI 위험. 데이터 PR로 **독립 매체가 먼저 인용**하게 한 뒤 따라오는 결과로.

---

## Part 4. 사이트별 전략 요약

| 사이트 | AdSense 우선도 | 최적 무료 채널 | 비AdSense 수익 | 특이사항 |
|---|---|---|---|---|
| **legalcostcalc.co** | ★★★ (최고 CPC) | Pinterest, Quora, 데이터 PR(지역신문), 법률 리스티클 | **제휴/리드젠 1차**(LegalZoom 등) | YMYL — E-E-A-T·면책 필수, 양산 주의 |
| **dentalcostfinder.co** | ★★★ | Pinterest, Quora, 환자 포럼/지역 FB, Shorts | 치과보험 제휴 | YMYL 헬스 — 고가 시술 페이지 우선 |
| **gofirepath.com** | ★★ (프리미엄=광고없음) | Pinterest, r/Fire(주의), Shorts, Quora | **프리미엄 $4.99/mo(ad-free)** | 프리미엄 출시 시 firepath Auto Ads 재검토 |
| **saascostx.com** | ★ (B2B 디스플레이 약) | Show HN, r/SaaS, LinkedIn, AlternativeTo/SaaSHub | **Pro $9.99/mo** + 제휴 | 장기 제휴/리드젠 중심 권장 |
| **launchcostcalc.com** | ★ | Show HN, r/SideProject, LinkedIn, PH | 법인설립/회계 제휴 | 비즈니스-금융 인접 콘텐츠로 RPM 보강 |

---

## Part 5. 단계별 로드맵

1. **지금~1·2주 (Tier-1 마감)**: Part 2.2 무료 세팅 전부 + **임베드 위젯** + 스키마/E-E-A-T/면책 + **양산 페이지 차별화·정리** + Pinterest 셋업 + 사이트별 비용 통계 5개 발행.
2. **씨앗 트래픽 (1~3개월)**: 데이터 PR(HARO 4종 + 발견 피칭) + 디렉터리 10~15 + PH 주 1개 + Quora/Pinterest 지속 + 필러/클러스터 글. **gofirepath 집중**.
3. **월 1,000 세션 도달**: 해당 사이트 → **Mediavine Journey** 테스트.
4. **월 25k PV / 연 $5k 도달**: **Raptive 또는 Mediavine 본진** 전환(RPM 1.5~3배). 1개씩.
5. **Q4 대비**: 9월 전 색인 완료, 치과·건강보험 페이지는 10월 오픈엔롤먼트 전, 금융/FIRE는 12~1월 갱신 (CPC 계절 피크 +30~50%).

---

## Part 6. 즉시 실행 체크리스트

**광고/계정 (당장, 무료)**
- [ ] 5개 사이트 Auto Ads 컨트롤 재설정(최대 광고 수·간격 캡)
- [ ] ads.txt 5개 "승인됨" 확인
- [ ] 세금정보(W-9/W-8BEN) + 지급 주소 제출
- [ ] 결과 하단 고가치 광고 슬롯(라벨+분리) 적용
- [ ] 자기클릭/트래픽구매 금지 원칙 고정

**SEO/품질 (1~2주)**
- [ ] 양산 페이지 고유 데이터·고유문구 감사 → 차별화 or noindex
- [ ] YMYL E-E-A-T(저자/검수/검토일/면책) 추가
- [ ] JSON-LD 스키마 사이트 일괄 적용
- [ ] 필러 페이지 + 상단 '빠른 답' 블록

**마케팅 (지속)**
- [ ] 공용 임베드 위젯 컴포넌트 출시(5개)
- [ ] 사이트별 "2026 평균 비용" 헤드라인 통계 + 방법론 페이지
- [ ] HARO 후속 4종 일일 모니터링
- [ ] Pinterest 비즈니스 계정 + 계산기당 핀 3~5개
- [ ] 디렉터리 10~15 + PH 주 1개(5주 분산)

---

## 부록 A. 검증 메모 (신뢰도)
- ✅ **확정**: Auto Ads 컨트롤 개편(2026.4), Mediavine Journey 1k세션/70%, Raptive 25k PV, Mediavine 본진 $5k/yr, $100 지급·$10 PIN, self-click 정지 위험, 자동 광고 새로고침 금지(애드센스).
- ⚠️ **추정치(블로그)일 뿐**: 모든 RPM/CPC 달러 수치. raw AdSense는 ~$1~3 CPM이 현실. **본인 AdSense 리포트로만 검증.**
- 🔁 **정정**: Ezoic은 이제 **250k MAU** 필요(과거 무최소 폐지) / Pinterest **631M MAU**(537M은 구형) / "CWV가 광고 송출에 직접 영향"은 **사실 아님**(순위에만 간접 영향).

## 부록 B. 대표 출처
- Google AdSense 정책/지원: 광고 게재 위치 정책, ads.txt 가이드, IVT/정책, 지급 임계, Auto Ads 설정 (`support.google.com/adsense/*`)
- web.dev — Core Web Vitals와 광고 수익 상관관계 / Google Publisher Tag 레이아웃 시프트 최소화
- Mediavine 공식 요건·수익배분 / Raptive 자격(SearchEngineJournal·PPC.land) / Ezoic 요건(2026.2 250k MAU)
- Seer Interactive — AI Overviews CTR 영향(2026) / Google Search Central — 스팸·도움되는 콘텐츠 정책
- 디지털 PR·HARO 후속(Backlinko, Prezly) / Pinterest Q1 2026 실적(631M MAU) / Reddit·Quora 정책

> 전체 원자료(8개 차원 × 발견·실행안·위험주장·검증): 세션 스크래치패드 `tasks/w0m29sq7f.output`
