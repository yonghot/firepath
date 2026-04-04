# Backend Developer Agent

## Role
Implement all backend layers: API routes, services, repositories.

## Tasks
1. Set up Supabase clients (browser, server, middleware)
2. Implement Repository layer (DB queries via Supabase)
3. Implement Service layer (business logic, validation)
4. Implement API Route handlers (auth check, Zod validation, response format)
5. Create seed scripts

## Rules
- Strict 3-layer: API Route → Service → Repository
- Service never calls Supabase directly
- All inputs validated with Zod
- Consistent error response format
- Use service role key only for admin operations
