# Admin-Created Client Account Flow - Build Log

Date: 2025-10-15  
Status: ✅ Live and working

---

## Overview
Admin creates a client profile in the dashboard. If an email is provided, the system sends a Supabase Auth invite that lands the client on `/claim`, where the client sets a password and then gets redirected to the app home. If no email is provided, the client record is created without an invite and can be updated/sent later.

---

## Key Files and Responsibilities

- `src/pages/AdminClients.tsx`
  - Admin UI to create/edit/delete clients
  - Email is optional; phone and location are required
  - On create, invokes Edge Function `send-client-invite` when email exists
  - Buttons to resend invite individually or in bulk
  - Cards display claim status: Aguarda Convite / Convite Enviado / Conta Vinculada

- `supabase/functions/send-client-invite/index.ts`
  - Validates eligibility (admin_created, unclaimed)
  - Ensures email availability in Auth
  - Sends Supabase invite with redirect to `/claim`
  - Updates `clients.claim_invited_at`
  - Provides `checkOnly` mode to pre-validate email before submitting

- `src/pages/Claim.tsx`
  - Client claim password-setup page
  - Processes session from URL hash, shows password form
  - “Claim gate” prevents early global redirects until password is set
  - On success: clears gate, drops hash, navigates to `VITE_AFTER_CLAIM_REDIRECT || '/'`

- `src/hooks/useAuth.tsx`
  - Global Supabase auth listener
  - Suppresses auto-redirect while on `/claim` when `claim_in_progress` is set
  - Preserves session and roles

- `src/utils/claimDiag.ts` (diagnostics optional)
  - Enable with `?claim_debug=1` or `localStorage.claim_debug='1'`
  - Traces session, auth events, navigate calls

---

## Edge Function Details: `send-client-invite`

- Redirect URL: `CLAIM_REDIRECT` env or fallback `https://vettale.shop/claim`
- API:
  - `POST body { email, client_id }` → sends invite (returns `{ status: 'invited' }`)
  - `POST body { email, checkOnly: true }` → pre-checks availability (returns `{ available: boolean }`)
- Security: service-role; CORS enabled for Admin UI
- Idempotence: pre-check in Auth and Clients avoids duplicates

---

## AdminClients Flow (Create)

1) Admin opens “Novo Cliente” modal.  
2) Required: `name`, `phone`, `location_id`. `email` optional.  
3) If email provided → pre-check availability via `send-client-invite` `checkOnly` mode.  
4) Insert into `public.clients` with `admin_created=true`, `needs_registration=true`.  
5) If email exists → call `send-client-invite` with `{ email, client_id }`.  
6) Show toast result and update grid.  

Resend invite later via card action or bulk button.

---

## Client Claim Flow (Email Provided)

1) Client receives “Reivindique sua conta” email (template uses `{{ .ConfirmationURL }}`), redirect_to `/claim`.  
2) `/claim` processes session from hash and immediately sets `localStorage.claim_in_progress='1'`.  
3) `/claim` displays password form; global redirects are suppressed while gate is set.  
4) Client defines password → `supabase.auth.updateUser({ password })`.  
5) On success → clear claim gate, `history.replaceState` to remove hash, one-time navigate to `VITE_AFTER_CLAIM_REDIRECT || '/'` (fallback retry after 1.5s).  
6) Session persists and the user stays authenticated on landing.

---

## UX States in AdminClients

- Card badges:
  - Aguarda Convite: `admin_created && !claim_invited_at && !claimed_at`
  - Convite Enviado: `admin_created && claim_invited_at && !claimed_at`
  - Conta Vinculada: `admin_created && claimed_at`
- Email missing shows “Email faltando”.
- Bulk invite only targets eligible clients.

---

## Configuration Checklist

- Supabase Auth → URL Configuration:
  - Site URL: `https://vettale.shop`
  - Additional Redirect URLs: `https://vettale.shop/claim`
- Edge Function env:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `CLAIM_REDIRECT=https://vettale.shop/claim`
- Frontend env:
  - `VITE_AFTER_CLAIM_REDIRECT=/`

---

## Acceptance and Testing

- Create client with/without email — record is created; email optional.  
- If email provided — invite sent; card shows “Convite Enviado”.  
- Email → /claim shows password form (no auto-redirect).  
- After password set — single redirect to target; session remains valid.  
- Refreshing /claim after success does not loop (gate cleared).  
- Resend invite works (single or bulk).

---

## Observability (Optional)

- Enable `?claim_debug=1` on `/claim` to print:
  - gate set/cleared, auth events, token processing, navigate calls, one-line summary.

---

## Notes / Decisions

- Email optional to allow phone-only client onboarding and later email collection.  
- “Claim gate” used to prevent premature redirects caused by generic auth listeners.  
- Invite flow reuses Supabase “Invite” template with redirect_to honored via `{{ .ConfirmationURL }}`.

---

## Impact

- Reliable admin-driven client onboarding with robust invite/claim handling.  
- Clear admin status signals and tooling (resend, bulk send, cleanup utilities).  
- Zero DB schema changes; uses existing columns and one Edge Function.
