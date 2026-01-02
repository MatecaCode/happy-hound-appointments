Title: Redirect expired/invalid Supabase auth links to Login (keep resend UX)

Date: 2025-10-27

Context
- Users sometimes open Supabase email links after they expire or with invalid tokens. Previously the app loaded the homepage, then failed later during auth handling.
- Goal: Detect these errors as early as possible and redirect to a known place, avoiding flicker and confusion. Keep the dedicated resend flow available.

Changes (Frontend-only)
- Early hash error detection (before Router mounts):
  - File: `src/App.tsx`
  - Logic: if `window.location.hash` contains `error_code=otp_expired`, `error=access_denied`, or `error_description` with "expired", immediately `history.replaceState` to `/login`.
  - Logs: `[GLOBAL_TOKEN_CATCHER] Expired/invalid auth link detected in URL hash; redirecting to /login`.

- Runtime guard in `GlobalTokenCatcher` effect:
  - File: `src/App.tsx`
  - At the start of the effect, if the hash includes the same error patterns, redirect to `/login` and return.

- Query-code flow handling remains:
  - If `exchangeCodeForSession(search)` returns an error containing "expired"/"invalid"/`invalid_grant`, we clean the URL and route to `/auth/expired` to offer resend.

- Resend UX kept intact:
  - Helper: `src/integrations/supabase/resendConfirmation.ts` using `supabase.auth.resend({ type: 'signup', email })`.
  - Page: `/auth/expired` (`src/pages/AuthExpired.tsx`) with email input, 30s cooldown, success toast, and `[RESEND]` error logs.
  - Login: `src/pages/Login.tsx` shows inline "Reenviar e-mail de confirmação" when error indicates unconfirmed email, also with 30s cooldown.

Files touched
- `src/App.tsx` (added early hash detection + guard inside `GlobalTokenCatcher`, route for `/auth/expired` already present)
- (Existing from previous task) `src/integrations/supabase/resendConfirmation.ts`, `src/pages/AuthExpired.tsx`, `src/pages/Login.tsx`

No backend/DB/RLS changes.

User impact
- Expired/invalid links now take users directly to Login (no homepage flicker).
- Users can still access `/auth/expired` to manually resend confirmation if needed.

Tested scenarios
1) Visit URL with `#error_code=otp_expired` → immediate redirect to `/login`.
2) Visit URL with `#error_description=Email+link+is+invalid+or+has+expired` → immediate redirect to `/login`.
3) OAuth/email link with `?code=...` but backend returns invalid_grant → redirected to `/auth/expired`, URL cleaned.
4) Login fails with "not confirmed" → inline resend link appears; cooldown prevents spamming; logs include `[RESEND]` on error.

Roll-back plan
- Remove the early hash-check block and the guard in `GlobalTokenCatcher` from `src/App.tsx`.

Notes
- All redirects use `history.replaceState` to avoid leaving broken links in browser history.

