// src/app/(main)/fire-guide/content.ts
// 오리지널 편집 가이드 콘텐츠 (2026, 웹검색으로 확인된 공식 출처 기반, 템플릿 아님).
// LaunchCostCalc의 /how-to-start-an-llc 모델(커밋 2746a0a)을 구조적으로 복제.
// AdSense "저가치 콘텐츠" 판정 대응 (부속U U-02). 모든 사실은 GUIDE_SOURCES 출처,
// 변동 항목은 페이지 상 "verify at {official source}"로 프레이밍 — 날조 없음.

import { formatAnnouncedOn, formatDollars, getRetirementLimitsState } from '@/lib/data/retirement-limits';

const SS = getRetirementLimitsState().ssa.current;
const SS_YEAR = SS.year;
const COLA = `${SS.data.colaPercent}%`;
const WAGE_BASE = formatDollars(SS.data.taxableWageBase);

export interface GuideSection {
  heading: string;
  prose: string;
  bullets?: string[];
  /** Optional marker used by page.tsx to splice a live-computed data block right after this section. */
  key?: string;
}
export interface GuideFact { fact: string; detail: string; sourceUrl: string; }
export interface GuideSource { name: string; url: string; }

export const GUIDE_PUBLISHED = '2026-07-18';

export const GUIDE_FACTS: GuideFact[] = [
  {
    fact: 'The 4% rule comes from a 1994 study, not a law of nature',
    detail:
      "Financial planner William Bengen published \"Determining Withdrawal Rates Using Historical Data\" in the Journal of Financial Planning in 1994, testing 30-year retirement outcomes against every rolling historical period back to 1926. The Trinity Study (1998) later corroborated the same ~4% figure using a different methodology.",
    sourceUrl: 'https://en.wikipedia.org/wiki/William_Bengen',
  },
  {
    fact: 'Updated research puts a base-case safe withdrawal rate at 3.9%, not 4%',
    detail:
      "Morningstar's most recent State of Retirement Income research puts the base-case safe starting withdrawal rate at 3.9% (up from 3.7% in the previous year's report) for a 30-year, 90%-success horizon on a 30%-50% equity portfolio. Retirees willing to tolerate some fluctuation in their spending can start with a withdrawal rate of nearly 6%.",
    sourceUrl: 'https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026',
  },
  {
    fact: 'The 2026 401(k) limit is $24,500; the IRA limit is $7,500',
    detail:
      'The IRS raised the 401(k)/403(b)/governmental 457/TSP employee deferral limit to $24,500 for 2026 (from $23,500) and the IRA contribution limit to $7,500 (from $7,000). Workers who turn 60-63 in 2026 get a special "super catch-up" of $11,250 instead of the standard $8,000 catch-up.',
    sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
  {
    fact: '2026 HSA limits are $4,400 self-only / $8,750 family',
    detail:
      "IRS Revenue Procedure 2025-19 set the 2026 HSA contribution limits at $4,400 for self-only coverage and $8,750 for family coverage. HSAs are triple-tax-advantaged (pre-tax in, tax-free growth, tax-free for medical costs) and many FIRE planners use them as a dedicated healthcare-cost bucket.",
    sourceUrl: 'https://www.irs.gov/pub/irs-drop/rp-25-19.pdf',
  },
  {
    fact: `Social Security's ${SS_YEAR} COLA is ${COLA}; the taxable wage base is ${WAGE_BASE}`,
    detail: `The Social Security Administration announced a ${COLA} cost-of-living adjustment for benefits payable starting January ${SS_YEAR} (announced ${formatAnnouncedOn(SS.data.announcedOn)}), and the taxable wage base — the income ceiling for the 12.4% Social Security payroll tax — rose to ${WAGE_BASE}.`,
    sourceUrl: SS.data.colaSourceUrl,
  },
  {
    fact: 'The average employer family health plan cost $26,993/year in 2025',
    detail:
      "KFF's 2025 Employer Health Benefits Survey found average annual premiums of $9,325 for single coverage and $26,993 for family coverage. That employer-subsidized rate disappears the moment you leave a job — which is exactly why bridging to Medicare eligibility at 65 is its own line item in a FIRE plan.",
    sourceUrl: 'https://www.kff.org/health-costs/2025-employer-health-benefits-survey/',
  },
  {
    fact: 'Early retirees can buy ACA Marketplace coverage and may qualify for subsidies',
    detail:
      "Leaving a job — even voluntarily, to retire early — triggers a Marketplace Special Enrollment Period. Premium tax credits depend on income and household size, but enrolling in an employer's retiree health plan instead makes you ineligible for Marketplace subsidies, so it's worth pricing both before deciding.",
    sourceUrl: 'https://www.healthcare.gov/retirees/',
  },
  {
    fact: 'Compounding, not income, is what drives early retirement',
    detail:
      "Investor.gov (the SEC's investor-education site) frames long-term wealth building as regular contributions plus time producing compound growth — the same mechanism behind every projection this calculator runs (see Methodology). Raising your savings RATE shortens the years needed far more reliably than raising income alone, because a higher rate compounds a larger base sooner.",
    sourceUrl: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compound-interest',
  },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    heading: 'What FIRE Actually Means (and What This Guide Covers)',
    prose:
      "FIRE stands for Financial Independence, Retire Early: saving and investing aggressively enough that your portfolio's returns cover your living expenses indefinitely, well before a traditional retirement age. It isn't one fixed number or one fixed age — \"FIRE\" splits into several distinct strategies (Lean, Regular, Fat, Coast, Barista) that trade off how much you cut spending, how early you stop contributing, and how much part-time income you keep. This guide walks through where the movement's core math comes from, how to compute your own FIRE number, what's changed in the underlying research since the original 4% rule, and the practical questions — savings rate, taxes, healthcare, Social Security — that determine whether a FIRE plan actually survives contact with 30+ years of real life.",
    bullets: [
      'This page is educational information, not personalized financial, tax, or legal advice — FIRE planning depends heavily on your own numbers, timeline, and risk tolerance.',
      'Every regulatory figure (contribution limits, COLA, tax thresholds) below is cited to its official source and dated — always verify the current-year figure before acting on it.',
      'For a plan built around your own numbers, use the calculator above; for personalized guidance, consult a licensed, fee-only financial advisor.',
    ],
  },
  {
    heading: 'The 4% Rule: Where It Actually Came From',
    prose:
      'The "4% rule" that anchors most FIRE math traces to a single 1994 paper: financial planner William Bengen\'s "Determining Withdrawal Rates Using Historical Data," published in the Journal of Financial Planning. Bengen tested every rolling 30-year retirement window in U.S. market history back to 1926 and asked: what starting withdrawal rate, adjusted annually for inflation, never ran a portfolio to zero within 30 years? The answer, for a 50/50 stock-bond portfolio, was almost exactly 4%. The Trinity Study, published in 1998 by three Trinity University professors, ran a related but distinct analysis and arrived at a similar figure using historical "success rate" percentages across different stock/bond mixes and time horizons — which is why the two names are often used interchangeably even though they are separate pieces of research.',
    bullets: [
      'Bengen (1994): tested rolling 30-year windows back to 1926; found ~4% never depleted a 50/50 portfolio, inflation-adjusted.',
      'Trinity Study (1998): a separate analysis using historical success-rate tables across stock/bond allocations; corroborated the ~4% figure.',
      'Bengen himself has since said the rule was never meant as a "set it and forget it" formula — see the newer-research section below.',
    ],
  },
  {
    heading: 'The 5 FIRE Types: Lean, Regular, Fat, Coast, and Barista',
    prose:
      'Every FIRE number is a variation on the same formula — annual expenses divided by a safe withdrawal rate — with a different multiplier applied to expenses depending on the lifestyle you\'re targeting. Lean FIRE targets 60% of your current expenses (a minimalist retirement); Regular FIRE targets 100% (your current lifestyle, unchanged); Fat FIRE targets 150% (more cushion, higher discretionary spending); Barista FIRE targets 50%, with part-time work covering the rest; and Coast FIRE is structurally different — instead of a percentage of expenses, it\'s the amount that, left untouched, compounds to your full Regular FIRE target by a chosen retirement age, at which point you can stop contributing new savings entirely.',
    bullets: [
      'Lean FIRE — 60% of expenses. Regular FIRE — 100%. Fat FIRE — 150%. Barista FIRE — 50% plus part-time income.',
      'Coast FIRE — a discounted "seed" amount computed from the Fisher real-return formula, not a flat multiplier.',
      'See the full breakdown, formulas, and worked examples for each type on the FIRE Types page.',
    ],
    key: 'fire-types-link',
  },
  {
    heading: 'How to Calculate Your Own FIRE Number',
    prose:
      'The core formula is simple: FIRE target = annual expenses ÷ safe withdrawal rate. At the common default of $40,000/year in expenses and a 4% SWR, that\'s $40,000 ÷ 0.04 = $1,000,000 for Regular FIRE — the "25× expenses" shorthand you\'ll see everywhere in FIRE writing is just the reciprocal of 4% (1 ÷ 0.04 = 25). From there, the harder question is how long it takes to reach that number, which depends on your current net worth, your annual savings, and your expected real (inflation-adjusted) return. The real return is computed as (1 + nominal return) ÷ (1 + inflation) − 1; year by year, your portfolio grows by that real return and then adds your annual savings, compounding until it crosses your target.',
    bullets: [
      'Target = annual expenses ÷ safe withdrawal rate (the "25× expenses" rule at a 4% SWR).',
      'Real return = (1 + nominal return) ÷ (1 + inflation) − 1 — this is what actually drives year-by-year compounding.',
      'Plug your own age, income, expenses, and savings rate into the calculator above to see your exact target and reach age for all 5 FIRE types at once.',
    ],
    key: 'calc-link',
  },
  {
    heading: 'Beyond 4%: What Newer Withdrawal-Rate Research Shows',
    prose:
      "The 4% figure is 30+ years old, and both markets and life expectancies have moved since 1994 — which is why researchers keep revisiting it. Morningstar's annual State of Retirement Income research has put the base-case \"safe starting withdrawal rate\" at 4.0% in 2023, 3.7% in 2024, and back up to 3.9% for its most recent 2025/2026 edition — a moving target that depends on current equity valuations, bond yields, and inflation expectations, not a fixed constant. Importantly, that base case assumes a fixed inflation-adjusted spending amount every year regardless of market performance; Morningstar's own research concludes that retirees willing to tolerate some fluctuation in their spending can start with a withdrawal rate of nearly 6%.",
    bullets: [
      "Morningstar's base-case safe withdrawal rate: 4.0% (2023) → 3.7% (2024) → 3.9% (2025/2026) — not a fixed number.",
      'Retirees willing to tolerate some fluctuation in spending can start with a withdrawal rate of nearly 6%, per the same research, versus a fixed real-dollar withdrawal.',
      'This calculator\'s default SWR stays at the widely recognized 4% benchmark; use the SWR slider (2%-6%) to model a more conservative or more flexible assumption.',
    ],
  },
  {
    heading: 'Sequence-of-Returns Risk: The Danger Zone Around Retirement',
    prose:
      "Average returns can be misleading in retirement planning — what actually determines whether a portfolio survives is the ORDER those returns arrive in, not just their long-run average. This is sequence-of-returns risk, and it's one of Bengen's core original findings: two retirees with identical average returns over 30 years can have wildly different outcomes if one hits a market crash in year one of retirement and the other hits it in year twenty. The highest-risk window — sometimes called the \"retirement red zone\" — spans roughly the five years before retirement through the first ten years after, because that's when the portfolio balance is largest and a downturn has the most dollars and the most remaining years to damage.",
    bullets: [
      'Sequence risk means WHEN losses happen matters more than the 30-year average return.',
      'The highest-risk window is roughly 5 years before through 10 years after your retirement date.',
      'FIRE retirees face this risk earlier and for longer than traditional 65-year-old retirees, since their portfolios must last decades longer.',
    ],
  },
  {
    heading: 'Your Savings Rate: The Variable That Actually Moves Your Timeline',
    prose:
      "Of every input in the FIRE formula, savings rate has the largest effect on how many years you work — far more than a raise, because a raise that gets fully spent doesn't change your timeline at all. The mechanism is compounding: a higher savings rate means more money invested sooner, which has more years to compound before you need it. The table below uses this calculator's own formulas — the same ones behind every result on this site — to show Regular FIRE reach age at the site's default $80,000 income and $40,000 expenses, varying only the savings rate.",
    bullets: [
      "Two people with identical income can reach FIRE decades apart purely because of savings rate, not income level.",
      'Cutting expenses moves the needle twice: it lowers your FIRE target AND (if income stays flat) raises your savings rate.',
    ],
    key: 'savings-rate',
  },
  {
    heading: 'Where to Put Your Money: 2026 Retirement Account Limits',
    prose:
      "Account type matters almost as much as savings rate, because tax-advantaged accounts let more of each dollar actually compound. For 2026, the IRS raised the 401(k)/403(b)/governmental 457/TSP employee deferral limit to $24,500 and the IRA limit to $7,500. A newer wrinkle from the SECURE 2.0 Act applies specifically to workers turning 60-63 in a given year: instead of the standard $8,000 catch-up, they get a \"super catch-up\" of $11,250 for 2026. HSAs — technically a healthcare account, not a retirement account — carry their own 2026 limits of $4,400 (self-only) / $8,750 (family) and are triple-tax-advantaged (pre-tax contributions, tax-free growth, tax-free withdrawals for qualified medical expenses), which is why many FIRE planners treat an HSA as a dedicated bucket for the healthcare-bridge years covered further below.",
    bullets: [
      '2026: 401(k)/403(b)/457/TSP limit $24,500; standard 50+ catch-up up to $8,000; ages 60-63 "super catch-up" $11,250.',
      '2026: Traditional/Roth IRA limit $7,500; 50+ catch-up adds $1,100 (total $8,600).',
      '2026: HSA limit $4,400 self-only / $8,750 family; 55+ catch-up adds $1,000 (unchanged from 2025).',
      'These figures adjust annually via IRS cost-of-living notices — always confirm the current year at irs.gov before contributing.',
    ],
  },
  {
    heading: 'Social Security and FIRE: What Early Retirees Should Know',
    prose:
      `FIRE plans are usually built to be self-sufficient without Social Security, since benefits generally can't be claimed before age 62 and are reduced further the earlier you claim relative to your full retirement age. That said, Social Security is real, ongoing income most FIRE retirees will eventually receive, and it's worth tracking two figures that change every year: the cost-of-living adjustment (COLA), which raised benefits ${COLA} for ${SS_YEAR}, and the taxable wage base (${WAGE_BASE} for ${SS_YEAR}) — the income ceiling above which the 12.4% Social Security payroll tax no longer applies, relevant to anyone still earning a high income while working toward FIRE.`,
    bullets: [
      `${SS_YEAR} COLA: ${COLA} benefit increase, effective for benefits payable starting January ${SS_YEAR}.`,
      `${SS_YEAR} taxable wage base: ${WAGE_BASE} — the income ceiling for the 12.4% Social Security payroll tax.`,
      "Benefit estimates and claiming-age trade-offs are highly individual — check your own record at ssa.gov rather than using a generic average.",
    ],
  },
  {
    heading: 'The Healthcare Bridge: Paying for Insurance Before Medicare',
    prose:
      "Health insurance is the single most common financial surprise in FIRE planning, because leaving a job usually means leaving employer-subsidized coverage years before Medicare eligibility at 65. KFF's 2025 Employer Health Benefits Survey found average annual premiums of $9,325 for single coverage and $26,993 for family coverage — and that's the employer-subsidized rate; buying similar coverage without an employer contribution costs more. The good news: leaving a job (even to retire) triggers an ACA Marketplace Special Enrollment Period, and depending on income and household size, early retirees may qualify for premium tax credits — though enrolling in an employer's retiree health plan instead, if offered, makes you ineligible for Marketplace subsidies, so it's worth comparing the two before choosing.",
    bullets: [
      '2025 average employer premiums: $9,325/year single, $26,993/year family (KFF survey).',
      'Leaving a job triggers an ACA Marketplace Special Enrollment Period — coverage can start without waiting for open enrollment.',
      "Marketplace subsidies depend on income/household size and are unavailable if you instead enroll in an employer retiree plan.",
      "Use the dedicated Healthcare Bridge Estimator to project your specific pre-Medicare coverage cost by retirement age.",
    ],
    key: 'healthcare-link',
  },
  {
    heading: 'Common FIRE Mistakes That Derail the Plan',
    prose:
      "Most FIRE plans don't fail because the math was wrong on day one — they fail because a real-world cost wasn't modeled. The most common gaps are healthcare (covered above), taxes (early withdrawals from tax-advantaged accounts before 59½ can trigger penalties without proper planning, like a Roth conversion ladder or SEPP/72(t) distributions), and a fixed spending assumption that doesn't flex during a market downturn early in retirement, when sequence-of-returns risk is highest. A closely related mistake is treating the 4% rule as guaranteed rather than as a historically-derived estimate — the newer research above shows the \"safe\" number moves with market conditions, and a plan with zero flexibility on spending has less margin than one built with guardrails.",
    bullets: [
      'Under-modeling healthcare costs before Medicare eligibility (see the Healthcare Bridge section above).',
      'Ignoring early-withdrawal tax rules on retirement accounts before age 59½ (Roth conversion ladders and SEPP/72(t) are the two common workarounds — both require careful, individualized tax planning).',
      'Treating 4% as a guarantee instead of a historically-derived estimate that has since been revised.',
      'No flexibility in spending during a market downturn in the first decade of retirement — exactly when sequence-of-returns risk is highest.',
    ],
  },
  {
    heading: 'Is FIRE Right for You? Weighing the Trade-offs',
    prose:
      "FIRE is a framework, not a mandate — the honest version of the pitch involves real trade-offs, not just a bigger number sooner. Lean FIRE gets you there fastest but assumes you're comfortable with a genuinely reduced lifestyle indefinitely; Fat FIRE removes that discomfort but takes meaningfully longer to reach; Coast and Barista FIRE both trade full retirement for partial financial pressure relief years earlier, at the cost of continuing some paid work. None of the five types is objectively \"correct\" — the right one depends on how much you value time versus lifestyle margin, how stable your income and health are, and how much uncertainty you're willing to carry into a retirement that, for a FIRE retiree, may need to last 40-50+ years instead of the 20-30 a traditional retiree plans for.",
    bullets: [
      "Longer time horizon (40-50+ years) means FIRE plans need MORE margin for error than a traditional 65-year-old's retirement plan, not less.",
      "There's no universally 'right' FIRE type — it's a trade-off between time, lifestyle, and risk tolerance, not a math problem with one correct answer.",
      'Try each type on the calculator with your own numbers side by side before committing to one path.',
    ],
    key: 'stats-link',
  },
  {
    heading: 'Staying on Track After You Reach FIRE',
    prose:
      "Reaching a FIRE number isn't the finish line — it's the start of the withdrawal phase, where sequence-of-returns risk and cost-of-living adjustments to contribution/benefit figures keep changing every year. The practical habit that matters most is revisiting your assumptions annually: re-check the current safe withdrawal rate research, re-confirm this year's IRS and Social Security figures rather than relying on last year's numbers, and re-run your healthcare cost estimate as premiums and ACA rules shift. This site's own default assumptions (expected return, inflation, SWR) are documented with their sources, and the dates of any source checks, on the Methodology page — the same discipline is worth applying to your personal plan.",
    bullets: [
      'Re-verify contribution limits, COLA figures, and healthcare premiums annually — every regulatory number in this guide changes yearly.',
      'Re-run your numbers through the calculator whenever your income, expenses, or market outlook changes meaningfully.',
      'See the Methodology page for exactly how this calculator\'s own default assumptions are sourced and dated.',
    ],
    key: 'methodology-link',
  },
];

export const GUIDE_SOURCES: GuideSource[] = [
  {
    name: 'William Bengen — Wikipedia (1994 "Determining Withdrawal Rates Using Historical Data")',
    url: 'https://en.wikipedia.org/wiki/William_Bengen',
  },
  {
    name: 'Trinity Study — Wikipedia (1998 corroborating research)',
    url: 'https://en.wikipedia.org/wiki/Trinity_study',
  },
  {
    name: 'Bankrate — The 4% Rule Is So 1994: The Original Author\'s New Advice',
    url: 'https://www.bankrate.com/retirement/revised-4-percent-rule/',
  },
  {
    name: 'CNBC — He invented the 4% rule of retirement income (Bengen, Sept. 2025)',
    url: 'https://www.cnbc.com/2025/09/03/4percent-rule-inflation-retirement.html',
  },
  {
    name: "Morningstar — What's a Safe Retirement Withdrawal Rate for 2026?",
    url: 'https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026',
  },
  {
    name: 'IRS — 401(k) limit increases to $24,500 for 2026, IRA limit increases to $7,500',
    url: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
  {
    name: 'IRS — Notice 2025-67 (2026 retirement plan COLA figures, primary document)',
    url: 'https://www.irs.gov/pub/irs-drop/n-25-67.pdf',
  },
  {
    name: 'IRS — Revenue Procedure 2025-19 (2026 HSA/HDHP limits, primary document)',
    url: 'https://www.irs.gov/pub/irs-drop/rp-25-19.pdf',
  },
  {
    name: `SSA — Social Security Announces ${SS.data.colaPercent} Percent Benefit Increase for ${SS_YEAR}`,
    url: SS.data.colaSourceUrl,
  },
  {
    name: `SSA — Contribution and Benefit Base (${SS_YEAR} taxable wage base ${WAGE_BASE})`,
    url: SS.data.wageBaseSourceUrl,
  },
  {
    name: 'KFF — 2025 Employer Health Benefits Survey',
    url: 'https://www.kff.org/health-costs/2025-employer-health-benefits-survey/',
  },
  {
    name: 'HealthCare.gov — Health Care Coverage for Retirees',
    url: 'https://www.healthcare.gov/retirees/',
  },
  {
    name: 'KFF — FAQ: Marketplace vs. employer retiree health plan subsidies',
    url: 'https://www.kff.org/faqs/faqs-health-insurance-marketplace-and-the-aca/early-retirees/im-63-and-about-to-retire-ill-be-offered-a-retiree-health-plan-can-i-look-for-better-coverage-and-subsidies-in-the-marketplace-instead/',
  },
  {
    name: 'Investor.gov (U.S. SEC) — Compound Interest',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compound-interest',
  },
];

/**
 * Volatile-fact verify notes (부속U §7 — "변동 사항은 verify at official source로
 * 프레이밍"). Not rendered as page copy verbatim; documents which figures in
 * GUIDE_FACTS/GUIDE_SECTIONS are regulatory/annual and must be reconfirmed
 * before relying on an exact number in a future year.
 */
export const GUIDE_VERIFY_NOTES: string[] = [
  '2026 IRS contribution limits (401(k) $24,500, IRA $7,500, HSA $4,400/$8,750, catch-ups) are finalized via Notice 2025-67 and Revenue Procedure 2025-19 as of this writing, but the IRS republishes new limits every year — verify at irs.gov before contributing in a future year.',
  "Morningstar's 3.9% base-case safe withdrawal rate is a research estimate that moves with market valuations and is republished annually (4.0% in 2023, 3.7% in 2024, 3.9% in 2025/2026) — re-check morningstar.com rather than treating 3.9% as fixed.",
  `Social Security's ${COLA} COLA and ${WAGE_BASE} wage base apply to ${SS_YEAR} only; the SSA recalculates both every year — reverify at ssa.gov for any year other than ${SS_YEAR}.`,
  "KFF's $9,325 (single) / $26,993 (family) average premiums are from the 2025 Employer Health Benefits Survey (that plan year); KFF publishes a new survey annually — reverify at kff.org for the current year's figures.",
  'ACA Marketplace subsidy eligibility (federal poverty level thresholds, premium tax credit formulas) changes annually and can shift with federal legislation — reverify at healthcare.gov before enrolling.',
];
