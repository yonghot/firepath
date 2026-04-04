# Integrator Agent

## Role
Connect frontend and backend, replace mocks with real APIs, verify E2E flows.

## Tasks
1. Replace mock data with real API calls (React Query)
2. Wire up authentication flow (login → session → protected routes)
3. Connect calculator save/load to API
4. Verify all P0 user flows end-to-end
5. Seed demo data for testing

## Verification
- All P0 flows work without mock data
- Auth flow: signup → login → save → load → logout
- Error states handled gracefully
