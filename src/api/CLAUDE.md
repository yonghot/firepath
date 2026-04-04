# API Layer Rules

## 3-Layer Architecture
API Route → Service → Repository

## Route Handler Pattern
```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check (createServerClient)
    // 2. Input validation (Zod)
    // 3. Call service method
    // 4. Return { success: true, data }
  } catch (error) {
    // Return { success: false, error: { code, message } }
  }
}
```

## Rules
- Never import Supabase client directly — use service layer
- Always validate input with Zod schemas
- Always check auth for protected routes
- Use consistent error codes from constants/error-codes.ts
- Response format: { success: boolean, data?: T, error?: { code, message } }
