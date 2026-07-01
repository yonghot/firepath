/**
 * Healthcare Bridge Estimator — pure, server/client-agnostic calculation.
 *
 * Estimates the total cost of bridging private health insurance from an
 * early-retirement date to Medicare eligibility at age 65.
 *
 * IMPORTANT DISCLAIMER: This is an INFORMATIONAL ESTIMATE ONLY.
 * - Annual premiums are user-supplied; we do NOT fabricate ACA subsidy figures.
 * - Actual premiums, subsidies, and eligibility depend on income, household
 *   size, plan choice, and state — check healthcare.gov for real quotes.
 * - Medicare eligibility is set by law at age 65 (Social Security Act §226).
 *   Source: https://www.medicare.gov/basics/get-started-with-medicare/when-does-medicare-coverage-start
 *
 * Formula:
 *   bridgeYears = max(0, 65 - retirementAge)
 *   totalCost   = annualPremium × Σ (1 + growthRate)^i for i = 0..bridgeYears-1
 *               = annualPremium × ((1+g)^n - 1) / g   when g ≠ 0
 *               = annualPremium × n                    when g = 0
 *
 * Input validation:
 *   - All inputs must be finite numbers (no NaN, no Infinity).
 *   - currentAge: 0–120 (integer check not required by spec; clamped to realistic range)
 *   - retirementAge: 0–120 and >= currentAge
 *   - annualPremium: 0–10_000_000 (must be non-negative)
 *   - growthRate: -1 to 5 (fraction, e.g. 0.05 for 5 %)
 *
 * All edge cases that would produce negative/NaN results return an error.
 */

export interface HealthcareBridgeInput {
  /** Your current age (years, ≥ 0) */
  currentAge: number;
  /** The age at which you plan to stop earning full-time income (≥ currentAge) */
  retirementAge: number;
  /**
   * Your estimated annual health-insurance premium in today's dollars.
   * USER-PROVIDED — we do not synthesize or adjust for ACA subsidies.
   * Reference: healthcare.gov or your insurer for real quotes.
   */
  annualPremium: number;
  /**
   * Optional annual growth rate for premiums (fraction, e.g. 0.05 = 5 %).
   * Default: 0 (no growth assumed).
   * Historical US health-insurance premium growth has averaged ~5 %/yr
   * (KFF Employer Health Benefits Survey, 2023).
   * Source: https://www.kff.org/health-costs/report/2023-employer-health-benefits-survey/
   */
  annualGrowthRate?: number;
}

export interface HealthcareBridgeResult {
  /** Number of years you need private coverage before Medicare at 65 */
  bridgeYears: number;
  /**
   * Total estimated cost in TODAY's dollars (not inflation-adjusted),
   * compounded by your supplied growthRate if provided.
   */
  totalEstimatedCost: number;
  /** The age at which Medicare coverage begins (always 65 per US law) */
  medicareEligibilityAge: 65;
  /** True when retirementAge >= 65 — no bridge period needed */
  noGapNeeded: boolean;
}

export interface HealthcareBridgeError {
  field: 'currentAge' | 'retirementAge' | 'annualPremium' | 'annualGrowthRate';
  message: string;
}

/** Medicare eligibility age under US law (Social Security Act §226). */
export const MEDICARE_ELIGIBILITY_AGE = 65 as const;

/**
 * Validates inputs and returns either a list of errors or the calculation result.
 *
 * Returns `{ ok: true, result }` on success or `{ ok: false, errors }` on failure.
 */
export function calculateHealthcareBridge(
  input: HealthcareBridgeInput
): { ok: true; result: HealthcareBridgeResult } | { ok: false; errors: HealthcareBridgeError[] } {
  const errors: HealthcareBridgeError[] = [];
  const growthRate = input.annualGrowthRate ?? 0;

  // --- Validate currentAge ---
  if (
    !Number.isFinite(input.currentAge) ||
    input.currentAge < 0 ||
    input.currentAge > 120
  ) {
    errors.push({
      field: 'currentAge',
      message: 'Current age must be a number between 0 and 120.',
    });
  }

  // --- Validate retirementAge ---
  if (
    !Number.isFinite(input.retirementAge) ||
    input.retirementAge < 0 ||
    input.retirementAge > 120
  ) {
    errors.push({
      field: 'retirementAge',
      message: 'Retirement age must be a number between 0 and 120.',
    });
  } else if (
    Number.isFinite(input.currentAge) &&
    input.retirementAge < input.currentAge
  ) {
    errors.push({
      field: 'retirementAge',
      message: 'Retirement age must be greater than or equal to current age.',
    });
  }

  // --- Validate annualPremium ---
  if (
    !Number.isFinite(input.annualPremium) ||
    input.annualPremium < 0 ||
    input.annualPremium > 10_000_000
  ) {
    errors.push({
      field: 'annualPremium',
      message: 'Annual premium must be a non-negative number up to $10,000,000.',
    });
  }

  // --- Validate growthRate ---
  if (!Number.isFinite(growthRate) || growthRate < -1 || growthRate > 5) {
    errors.push({
      field: 'annualGrowthRate',
      message: 'Annual growth rate must be between -100% (-1) and 500% (5).',
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // --- Compute bridge ---
  const bridgeYears = Math.max(0, MEDICARE_ELIGIBILITY_AGE - input.retirementAge);
  const noGapNeeded = bridgeYears === 0;

  let totalEstimatedCost: number;
  if (bridgeYears === 0) {
    totalEstimatedCost = 0;
  } else if (growthRate === 0) {
    totalEstimatedCost = input.annualPremium * bridgeYears;
  } else {
    // Geometric series: P × ((1+g)^n - 1) / g
    totalEstimatedCost =
      input.annualPremium * (Math.pow(1 + growthRate, bridgeYears) - 1) / growthRate;
  }

  return {
    ok: true,
    result: {
      bridgeYears,
      totalEstimatedCost: Math.round(totalEstimatedCost),
      medicareEligibilityAge: MEDICARE_ELIGIBILITY_AGE,
      noGapNeeded,
    },
  };
}
