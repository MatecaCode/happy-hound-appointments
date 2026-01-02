# [LOG_UPDATE] — Admin Client Invite + Claim Flow (Implementation + Diagnostics)

date: 2025-12-31  
area: Auth / Clients / Edge Functions / Admin UI  
project_ref: ieotixprkfglummoobkb.supabase.co

## 0) Purpose
This document is the single source of truth for how the admin “invite and claim” flow works today, what code paths are involved, and how to diagnose/fix issues quickly. Use this when something breaks to find the exact component to inspect or change.

## 1) High-level flow
1) Admin creates a client in `AdminClients.tsx`.
2) The UI calls Edge Function `send-client-invite` (service role for invite; user auth for policy).
3) Supabase Auth creates an invited user and sends the email; we stamp `clients.claim_invited_at`.
4) User clicks the invite link → lands on `/claim`.
5) `/claim` establishes a session regardless of token placement (PKCE `?code=...` or hash `#access_token=...`).
6) `/claim` resolves/links the pending client to the auth user and shows the “Criar senha” step.
7) On password set, claim finalizes and redirects.

## 2) Code map (files and responsibilities)

- UI — Admin side
  - `src/pages/AdminClients.tsx`
    - Create client (sets `admin_created=true`, `user_id=NULL`, `created_by=<admin>`).
    - Invite immediately on create; handles 409 codes gracefully.
    - Manual invite + bulk invite with 5‑minute cooldown (based on `claim_invited_at`).
    - Uses Authorization header for Edge Function calls.
    - Delete path attempts auth deletion by `user_id`, or by `email` fallback.

- UI — Claim page
  - `src/pages/Claim.tsx`
    - Session init on mount:
      - PKCE query `?code=...` → `supabase.auth.exchangeCodeForSession(search)`.
      - Hash tokens `#access_token=...` → `supabase.auth.getSessionFromUrl({ storeSession: true })`.
      - Cleans URL after processing. Adds 2.5s fail-safe to avoid infinite spinner.
    - Lookup/link order after session:
      1) `clients` by `user_id = auth.uid()` (already linked).
      2) `preclient_id` from `user_metadata/app_metadata` → `clients` by id; if not linked, link (direct or RPC fallback).
      3) Fallback by email (`admin_created=true`, `user_id IS NULL`) → RPC link by email.
      4) If client is linked to a different user → error “Conta já vinculada a outro usuário”.
    - Always shows “Criar senha” step; on success stamps `claimed_at` idempotently.

- Global token guard
  - `src/App.tsx` → `GlobalTokenCatcher`
    - Defers to `/claim` when hash tokens are present; does not clear the hash on `/claim` to avoid races.

- Edge Functions
  - `supabase/functions/send-client-invite/index.ts`
    - Auth via caller’s JWT (`authClient.auth.getUser()`); enforces admin rate-limit + dedupe by `user_id:client_id:mode` (30s).
    - Policy via RPC (must use `authClient`): `admin_get_client_claim_status(_client_ids uuid[])`.
    - Fetches authoritative email from `clients` or request payload.
    - Sends invite via `admin.auth.admin.inviteUserByEmail(emailForInvite, { redirectTo: CLAIM_REDIRECT, data: { preclient_id } })`.
    - Stamps `clients.claim_invited_at`.
    - Returns structured codes: `ALREADY_LINKED`, `ALREADY_LINKED_UNVERIFIED`, `INVITE_BLOCKED`, `NOT_FOUND`, `NO_EMAIL`, `DEDUPE` (skipped).
  - `supabase/functions/admin_resend_verification` → resend verification for already-existing users.
  - `supabase/functions/delete-staff-user` and `admin-delete-auth-user` → service-role cleanup helpers.
  - `supabase/functions/_shared/cors.ts` → CORS allow-list.

- RPCs / SQL (selected)
  - `public.admin_get_client_claim_status(_client_ids uuid[])` (SECURITY DEFINER; checks `has_role(auth.uid(),'admin')`).
  - `public.link_client_to_auth(_email text, _auth_user_id uuid)` (manual link fallback).

## 3) Data model and invariants
- `public.clients` (columns relevant here)
  - `id uuid` (pre-client id used in invite metadata).
  - `email text`, `admin_created boolean`, `user_id uuid NULL`, `claim_invited_at timestamptz NULL`, `claimed_at timestamptz NULL`.
- Invariants
  - Admin-created clients: `admin_created=true`, `user_id IS NULL` until claimed.
  - Invite stamps `claim_invited_at` and sends `preclient_id` via Auth metadata.
  - On claim: set `clients.user_id = auth.uid()`, stamp `claimed_at` idempotently.

## 4) End-to-end data flow (tables)

1) Admin creates client
   - `public.clients`: insert row `{ admin_created=true; user_id=NULL; created_by=<admin> }`.
2) Invite sent
   - `auth.users`: invited user row created (unconfirmed).
   - `auth.users.raw_user_meta_data`: includes `{ preclient_id: <client_id> }` (Auth metadata via `inviteUserByEmail`).
   - `public.clients`: `claim_invited_at = now()`.
3) Invite link click → /claim
   - Browser URL contains either `?code=...&type=invite` or `#access_token=...`.
   - `/claim` persists session (PKCE or hash) and then resolves client:
     - by `user_id`, or `preclient_id`, or `email` (admin_created=true).
4) Claim finalize
   - `public.clients`: `user_id = auth.uid()` (if NULL); `claimed_at = now()` (if NULL).
5) Password setup (on `/claim`)
   - `supabase.auth.updateUser({ password })` → success; user stays logged in.

## 5) UX details and guardrails
- Cooldown: 5 minutes (UI) — disables resend button and bulk invite skips in-cooldown clients.
- Dedupe: server-side 30s window by `user_id + client_id + mode` returns `{ code:'DEDUPE', skipped:true }` with 200.
- Create flow invite:
  - 409 (conflict) codes are handled gently:
    - `ALREADY_LINKED`: info toast.
    - `ALREADY_LINKED_UNVERIFIED`: auto-resend verification.
    - `INVITE_BLOCKED`: warning toast.
  - 400/401/500: treated as real failures; we surface message + allow “Reenviar” action.
- Deletion path
  - After DB cleanup, attempts auth deletion by `user_id`; if absent, falls back to `email` lookup (edge function).

## 6) Recent fixes (root causes and remedies)
- 401/500 on invite
  - Cause: missing Authorization header (UI) and/or policy RPC called via service-role (`admin.rpc`) so `auth.uid()` was NULL.
  - Fix: UI adds `Authorization: Bearer <access_token>`; function calls policy via `authClient.rpc`.
- Wrong payload on manual invite
  - Cause: UI sent `{ clientId }`; function expects `{ client_id, email }`.
  - Fix: aligned payload and added email guard; bulk updated similarly.
- Spam/duplicates
  - Fix: UI cooldown + function dedupe; 409s mapped to user-friendly toasts.
- /claim infinite loading
  - Cause: token parsing mismatch + race clearing hash in `GlobalTokenCatcher` before `/claim` persisted the session.
  - Fix: `/claim` now handles PKCE + hash; `GlobalTokenCatcher` defers on `/claim`; `getSessionFromUrl({ storeSession: true })` used to persist.
- Linking robustness
  - Enhancement: `/claim` resolves by `user_id` → `preclient_id` → `email` (admin_created) and links idempotently; handles “already linked to another user” explicitly.

## 7) Diagnostics: what to log and where

- Browser (invite/claim)
  - On `/claim` mount:
    - `href`, `search`, `hash`, and which method ran (PKCE vs hash).
    - `exchangeCodeForSession`/`getSessionFromUrl` results.
    - `supabase.auth.getSession()` immediately after processing.
    - `onAuthStateChange` events (inspect `event`, `session.user.id`).  
  - Expected after click: SIGNED_IN/TOKEN_REFRESHED and a non-null session.

- Edge Function logs (`send-client-invite`)
  - Look for: `[INVITE] start`, `[INVITE] rpc call ...`, `[INVITE] rpc result`, `[INVITE] inviteUserByEmail START/OK`, `updated clients.claim_invited_at`, `[INVITE][ERROR] ...`.
  - 500: inspect `reason` JSON; likely RPC “not authorized” (wrong client) or email provider config/redirect issues.

- DB quick checks (SQL)
  - Invited user:
    ```sql
    select id, email, invited_at, confirmation_sent_at, last_sign_in_at
    from auth.users
    where lower(email) = lower('<email>');
    ```
  - Client row:
    ```sql
    select id, email, user_id, admin_created, claim_invited_at, claimed_at
    from public.clients
    where lower(email) = lower('<email>');
    ```

## 8) Operational checklists

- When invite fails:
  1) Network request → confirm Authorization header present.
  2) Edge logs → confirm policy RPC runs via `authClient` (not `admin`).
  3) Supabase Auth settings → Allowed Redirect URLs includes `https://vettale.shop/claim` and Site URL matches.
  4) Function JSON reason → map to fix (NO_EMAIL, NOT_FOUND, INVITE_BLOCKED, etc.).

- When /claim spins or errors:
  1) Console: confirm URL tokens (`?code` or `#access_token`).
  2) Verify which method ran and result (`exchangeCodeForSession` vs `getSessionFromUrl({ storeSession: true })`).
  3) Ensure `GlobalTokenCatcher` did not clear tokens on `/claim`.
  4) Once session exists, check linking path order and errors.

## 9) Key code references

UI invite on create (good payload + 409 handling):
```638:663:src/pages/AdminClients.tsx
        const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
          'send-client-invite',
          {
            body: {
              email: clientData.email,
              client_id: clientData.id
            }
          }
        );
```

Function: policy via user-auth client:
```132:139:supabase/functions/send-client-invite/index.ts
    console.log("[INVITE] rpc call admin_get_client_claim_status", { client_id });
    const { data: statusRows, error: rerr } = await authClient.rpc("admin_get_client_claim_status", { _client_ids: [client_id] });
    if (rerr) throw rerr;
```

Claim page: hash flow with storage persistence:
```139:152:src/pages/Claim.tsx
          const res = await supabase.auth.getSessionFromUrl({ storeSession: true });
          console.log('[CLAIM] getSessionFromUrl result', res);
          // Clean hash immediately after processing
          window.history.replaceState(null, '', window.location.pathname);
```

Global catcher: defer to /claim to prevent races:
```114:133:src/App.tsx
        const hasHashTokens = !!hash && /(access_token=|type=)/.test(search);
        if (hasHashTokens) {
          const onClaimRoute = pathname.startsWith('/claim');
          if (onClaimRoute) {
            console.log('⏩ [GLOBAL_TOKEN_CATCHER] On /claim — delegating token processing to Claim.tsx');
            return;
          }
          setTimeout(() => { window.history.replaceState({}, document.title, pathname + search); }, 0);
          return;
        }
```

## 10) Acceptance tests
- Admin creates client (with email) → invite auto-sent; `clients.claim_invited_at` stamped.
- Clicking invite:
  - `/claim` establishes a session and shows “Criar senha” within a few seconds.
  - After setting password: `clients.user_id=auth.uid()` and `clients.claimed_at` set; app redirects.
- Manual/Resend invite:
  - Respects 5‑minute cooldown; bulk skips cooldown; dedupe avoids duplicate sends; 409 codes soft-handled.

## 11) Future hardening (optional)
- Make `claim_client_account(preclient_id uuid)` RPC (SECURITY DEFINER) that atomically links + stamps claimed_at to centralize logic server-side.
- Structured audit logs for invite/claim events with correlation IDs.

---
status: production  outcome: pass (with the above fixes)  last_verified: 2025-12-31


