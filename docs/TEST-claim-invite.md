# Client Claim Invite Test Plan

## Overview
This document outlines the manual test plan for the client claim invite flow. The system allows admins to create clients who can then claim their accounts via email invitation.

## Test Environment Setup
- **Local Development:** `http://localhost:8080`  
- **Production:** `https://vettale.shop`
- **Edge Function:** `send-client-invite` deployed to Supabase
- **Database:** Trigger `trg_link_client_on_email_confirmed` active on `auth.users`

## Test Cases

### 1. Admin Creates Client + Auto-Invite
**Objective:** Verify admin can create a client and invitation is automatically sent.

**Steps:**
1. Login as admin to the system
2. Navigate to Admin → Clients
3. Click "Create Client" and fill form:
   - Name: "Teste Cliente Reivindicação"
   - Email: "teste.claim@example.com" 
   - Phone: "+55 11 99999-9999"
   - Address: "Rua Teste, 123"
4. Submit form

**Expected Results:**
- ✅ Client created successfully with `admin_created = true`, `user_id = NULL`
- ✅ Edge Function automatically sends invitation email
- ✅ `clients.claim_invited_at` is set to current timestamp  
- ✅ Client card shows "🟡 Convite Enviado" badge
- ✅ No CORS errors in browser console
- ✅ Toast message: "Cliente criado com sucesso! Convite enviado para teste.claim@example.com"

**Database Verification:**
```sql
SELECT id, name, email, admin_created, user_id, claim_invited_at, claimed_at 
FROM clients WHERE email = 'teste.claim@example.com';
```
- `admin_created = true`
- `user_id = NULL` 
- `claim_invited_at != NULL`
- `claimed_at = NULL`

---

### 2. Client Confirms Email + Account Linking  
**Objective:** Verify email confirmation triggers account linking.

**Steps:**
1. Check email inbox for "teste.claim@example.com"
2. Open "You have been invited" email from Supabase
3. Click "Ativar minha conta" button
4. Complete Supabase auth signup (password, confirm)
5. User is redirected to `/claim` page
6. Return to Admin → Clients and refresh

**Expected Results:**
- ✅ Email redirect leads to correct claim URL (`/claim`)
- ✅ User auth account created with `email_confirmed_at != NULL`
- ✅ Trigger fires on `auth.users` UPDATE of `email_confirmed_at`
- ✅ `clients.user_id` is now set to `auth.users.id`
- ✅ `clients.claimed_at` is set to current timestamp
- ✅ Client card badge changes to "🟢 Conta Vinculada"

**Database Verification:**
```sql
-- Check client record
SELECT id, name, email, admin_created, user_id, claim_invited_at, claimed_at 
FROM clients WHERE email = 'teste.claim@example.com';

-- Check auth user
SELECT id, email, email_confirmed_at 
FROM auth.users WHERE email = 'teste.claim@example.com';
```
- `clients.user_id = auth.users.id`
- `clients.claimed_at != NULL`
- `auth.users.email_confirmed_at != NULL`

---

### 3. Manual Resend Invite (Idempotent)
**Objective:** Verify manual invite resend works and is safe to repeat.

**Steps:**
1. Create another client: "teste.resend@example.com" with admin_created=true
2. Wait for auto-invite (should show "Convite Enviado")
3. Click the 📧 (Send) button on the client card
4. Click the 📧 button again (test idempotency)

**Expected Results:**
- ✅ First manual send: "Convite enviado para teste.resend@example.com"
- ✅ Second manual send: Should not error, can update `claim_invited_at` 
- ✅ No duplicate emails sent (Supabase handles this)
- ✅ Edge Function returns `{status: "invited"}` both times

---

### 4. CORS + Browser Compatibility
**Objective:** Verify Edge Function works from browser without CORS issues.

**Steps:**
1. Open browser developer tools (F12) → Console tab
2. Create a new client or use manual send button
3. Monitor Network tab for Edge Function calls
4. Check Console for any CORS-related errors

**Expected Results:**
- ✅ No CORS preflight errors in console
- ✅ Network request shows successful POST to `/functions/v1/send-client-invite`
- ✅ Response includes proper `Access-Control-Allow-Origin: *` header
- ✅ Function works identically in Chrome, Firefox, Safari

---

### 5. Edge Cases + Error Handling

#### 5.1 Already Claimed Client
**Steps:**
1. Use client from Test Case 2 (already claimed)
2. Try to click Send button

**Expected Results:**
- ✅ Send button should NOT be visible (condition: `!client.claimed_at`)
- ✅ If called directly, function returns 409 "client not eligible for invite"

#### 5.2 Non-Admin Created Client  
**Steps:**
1. Create client with `admin_created = false` 
2. Check if Send button appears

**Expected Results:**
- ✅ Send button should NOT be visible 
- ✅ No claim-related badges shown

#### 5.3 Invalid/Missing Client
**Steps:**
1. Call Edge Function with invalid `client_id`
2. Call Edge Function with mismatched email

**Expected Results:**
- ✅ Function returns 404 "client not found or email mismatch"
- ✅ No database changes made

---

## Status Badge Reference

| Condition | Badge | Color | Description |
|-----------|--------|--------|-------------|
| `claimed_at != NULL` | 🟢 Conta Vinculada | Green | Client successfully claimed account |
| `claim_invited_at != NULL && claimed_at == NULL` | 🟡 Convite Enviado | Yellow | Invite sent, awaiting claim |
| `!claim_invited_at && !claimed_at` | 🔴 Aguarda Convite | Red | Ready for invite |

## Database Schema Reference

```sql
-- Key columns for claim flow
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS 
  claim_invited_at timestamptz,  -- When invite was sent
  claimed_at timestamptz;        -- When client completed claim

-- Trigger function (links on email confirmation)  
CREATE TRIGGER trg_link_client_on_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_client_when_email_confirmed();
```

## Troubleshooting

### Common Issues:
1. **CORS errors:** Ensure Edge Function deployed with proper headers
2. **Trigger not firing:** Check `auth.users.email_confirmed_at` is actually set
3. **Multiple clients same email:** Trigger won't link if multiple matches found
4. **Redirect not working:** Verify `CLAIM_REDIRECT` environment variable

### Debug Queries:
```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trg_link_client_on_email_confirmed';

-- Check unlinked admin clients  
SELECT email, admin_created, user_id, claim_invited_at, claimed_at
FROM clients 
WHERE admin_created = true AND user_id IS NULL;

-- Check recent auth signups
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC LIMIT 10;
```
