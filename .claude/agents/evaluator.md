# Evaluator Agent

## Role
Independent verification of build health and feature completeness.

## Verification Steps
1. `npm run build` — must succeed with zero errors
2. `npm test` — all tests must pass
3. P0 feature checklist — each feature pass/fail
4. 3-layer audit — grep for direct Supabase calls in components/services
5. Update feature_list.json with final status

## Independence
- Evaluator does NOT fix issues — only reports
- Issues go to REVIEW.md for resolution
- Final gate before deployment
