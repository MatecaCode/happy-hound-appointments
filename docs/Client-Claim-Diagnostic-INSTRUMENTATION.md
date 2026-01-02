# Client Claim Redirect - Diagnostic Instrumentation
**Date:** October 15, 2025  
**Status:** 🔬 DIAGNOSTIC MODE  
**Purpose:** Trace exact flow and identify redirect blocker

---

## 🎯 **OBJECTIVE**

Diagnose why the client claim page (`/claim`) does not redirect after password setup, without changing behavior.

---

## 🔧 **INSTRUMENTATION ADDED**

### **1. Diagnostic Utility (`src/utils/claimDiag.ts`)**

**Purpose:** Central diagnostic logger with event tracking

**Features:**
- Enable with `?claim_debug=1` in URL or `localStorage.claim_debug='1'`
- Timestamped console logging with `[CLAIM]` prefix
- Global event tracker accessible via `window.CLAIM_DIAG.events`
- Runtime summary generator

**Usage:**
```typescript
import { claimDiag, generateClaimSummary } from '@/utils/claimDiag';

// Log events
claimDiag.log('event name', data);

// Push to event tracker
(window as any).CLAIM_DIAG?.push({ step: 'event_name', ...data });

// Generate summary at end
generateClaimSummary();
```

---

### **2. Instrumentation Points in Claim Component**

All instrumentation is **conditional** (only runs when `claimDiag.on === true`):

#### **A. Component Mount (Line ~76-119)**
Logs:
- URL hash, search params, pathname
- Whether tokens are present in hash
- **INVENTORY REPORT** - Lists all files, effects, functions, Supabase calls, navigation calls, and guards

Events pushed:
```typescript
{ step: 'mount', hasTokens, hash, path }
```

#### **B. Session Processing (Line ~121-161)**
Logs:
- Session processing start/skip
- `getSessionFromUrl()` result
- Hash cleanup after session

Events pushed:
```typescript
{ step: 'session_set', ok, userId, error }
{ step: 'hash_cleaned', when: 'after_session' }
{ step: 'session_error', error }
```

#### **C. Auth State Change Listener (Line ~163-191)**
Logs:
- Listener setup
- Every auth event received
- Whether event triggers redirect
- Hash cleanup in auth listener

Events pushed:
```typescript
{ step: 'auth_event', event, userId }
{ step: 'hash_cleaned', when: 'auth_event' }
```

#### **D. Password Submit Handler (Line ~285-364)**
Logs:
- Validation failures (early returns)
- `updateUser()` start/done
- Success/error states
- Hash cleanup after password update
- Navigate calls (immediate + fallback)

Events pushed:
```typescript
{ step: 'early_return', reason }
{ step: 'update_user_start' }
{ step: 'update_user_done', ok, error }
{ step: 'hash_cleaned', when: 'after_password_update' }
{ step: 'unexpected_error', error }
```

#### **E. Safe Navigate Function (Line ~47-73)**
Logs:
- Navigate blocked (already redirected)
- Navigate called with target
- Hash cleanup before navigate
- Navigate execution success/error

Events pushed:
```typescript
{ step: 'navigate_blocked', reason }
{ step: 'navigate_called', target }
{ step: 'hash_cleaned', when: 'before_navigate' }
{ step: 'navigate_error', error }
```

---

## 📊 **EXPECTED OUTPUT**

### **Console on Load (with ?claim_debug=1):**

```
🔍 CLAIM FLOW INVENTORY
Redirect Target: /
Files/Components touching claim flow:
  - src/pages/Claim.tsx (this component)
  - src/utils/claimDiag.ts (diagnostic utility)
  - src/hooks/useAuth.ts (auth context)
  - src/integrations/supabase/client.ts (supabase client)

Effects & Functions:
  - Session bootstrap: useEffect (line ~75-126)
  - onAuthStateChange: useEffect (line ~128-156)
  - checkClaimStatus: useEffect (line ~158-161)
  - safeNavigate: useCallback (line ~47-73)
  - handlePasswordSubmit: function (line ~285)

Supabase Auth Calls:
  - supabase.auth.getSessionFromUrl() (line ~105)
  - supabase.auth.updateUser({ password }) (line ~309)
  - supabase.auth.onAuthStateChange() (line ~132)

Navigation Calls:
  - navigate(TARGET, { replace: true }) via safeNavigate() (line ~67)

Route Guards:
  - redirectedRef guard in safeNavigate (line ~49)
  - checkClaimStatus guard (line ~160): if (!user || redirectedRef.current) return
```

### **Console During Password Setup:**

```
[CLAIM] <timestamp> MOUNT { hash: '#access_token=...', ... }
[CLAIM] <timestamp> EVT { step: 'mount', hasTokens: true, ... }
[CLAIM] <timestamp> processing session from URL hash
[CLAIM] <timestamp> getSessionFromUrl result: { ok: true, userId: '...' }
[CLAIM] <timestamp> EVT { step: 'session_set', ok: true, userId: '...' }
[CLAIM] <timestamp> cleaning hash after session processing
[CLAIM] <timestamp> EVT { step: 'hash_cleaned', when: 'after_session' }
[CLAIM] <timestamp> setting up onAuthStateChange listener
[CLAIM] <timestamp> auth event: SIGNED_IN userId: ...
[CLAIM] <timestamp> EVT { step: 'auth_event', event: 'SIGNED_IN', userId: '...' }
[CLAIM] <timestamp> auth event triggers redirect: SIGNED_IN
[CLAIM] <timestamp> cleaning hash in auth listener
[CLAIM] <timestamp> EVT { step: 'hash_cleaned', when: 'auth_event' }
[CLAIM] <timestamp> navigate_called target: /
[CLAIM] <timestamp> EVT { step: 'navigate_called', target: '/' }
...
```

### **Runtime Summary (after 1.5s fallback):**

```
[CLAIM] seq -> tokens?=true setSession=ok updateUser=ok authEvt=USER_UPDATED navigate_called=2
[CLAIM] Full event trace: [
  { step: 'mount', hasTokens: true, ... },
  { step: 'session_set', ok: true, ... },
  { step: 'update_user_start' },
  { step: 'update_user_done', ok: true },
  { step: 'navigate_called', target: '/' },
  { step: 'auth_event', event: 'USER_UPDATED' },
  { step: 'navigate_called', target: '/' },
  ...
]
```

---

## 🧪 **TESTING PROCEDURE**

### **Step 1: Enable Diagnostics**
```
Option A: Add ?claim_debug=1 to URL
Option B: In browser console: localStorage.claim_debug='1'
```

### **Step 2: Reproduce Flow**
1. Admin creates client with email
2. Admin sends invite email
3. Client clicks email link → `/claim#access_token=...`
4. Client enters password and clicks "Definir Senha"

### **Step 3: Observe Console Output**
- Check **INVENTORY REPORT** on mount
- Watch **timestamped events** during flow
- Read **runtime summary** after 1.5s

### **Step 4: Inspect Event Trace**
```javascript
// In browser console:
window.CLAIM_DIAG.events
```

---

## 🔍 **DIAGNOSTIC ANALYSIS GUIDE**

### **Scenario 1: Navigate Never Called**
**Symptom:** Runtime summary shows `navigate_called=0`

**Possible Causes:**
- Early return in `handlePasswordSubmit` before navigate
- Check for `{ step: 'early_return', reason: '...' }` events
- `updateUser` may have failed - check `{ step: 'update_user_done', ok: false }`

**Action:** Find the exact line causing early return

---

### **Scenario 2: Navigate Called But Not Working**
**Symptom:** Runtime summary shows `navigate_called=1` or `navigate_called=2`

**Possible Causes:**
- Hash not cleaned before navigate
- Multiple navigate calls competing
- React Router navigation blocked
- Component re-render canceling navigation

**Evidence to Look For:**
```javascript
// Check if hash cleanup happened
events.filter(e => e.step === 'hash_cleaned')

// Check if navigate was blocked
events.find(e => e.step === 'navigate_blocked')

// Check for navigation errors
events.find(e => e.step === 'navigate_error')

// Check auth events
events.filter(e => e.step === 'auth_event')
```

---

### **Scenario 3: Multiple Auth Events**
**Symptom:** Many `{ step: 'auth_event' }` entries

**Analysis:**
- Are multiple events firing? (SIGNED_IN, USER_UPDATED, TOKEN_REFRESHED)
- Is each triggering navigate?
- Are navigates being blocked after first call?

---

### **Scenario 4: Session Issues**
**Symptom:** `{ step: 'session_set', ok: false }`

**Analysis:**
- Session not established from URL hash
- User not authenticated when trying to update password
- Check `updateUser` error: `session_not_found`

---

## 📋 **EXPECTED BLOCKERS**

Based on the instrumentation, here are likely blockers:

### **Blocker 1: Hash Re-Processing Loop**
**Symptoms:**
- Multiple `{ step: 'hash_cleaned' }` events
- Navigate called but page re-renders
- URL hash keeps reappearing

**Evidence:**
```javascript
events.filter(e => e.step === 'hash_cleaned').length > 1
```

---

### **Blocker 2: Auth Event Not Firing**
**Symptoms:**
- `updateUser` succeeds
- No `{ step: 'auth_event', event: 'USER_UPDATED' }` in trace
- Only immediate navigate called (fallback never reached)

**Evidence:**
```javascript
events.find(e => e.step === 'update_user_done' && e.ok === true)
!events.find(e => e.step === 'auth_event' && e.event === 'USER_UPDATED')
```

---

### **Blocker 3: Navigate Immediately Blocked**
**Symptoms:**
- Navigate called
- Immediately followed by `{ step: 'navigate_blocked' }`
- `redirectedRef.current` already true

**Evidence:**
```javascript
const navCall = events.findIndex(e => e.step === 'navigate_called');
const navBlock = events.findIndex(e => e.step === 'navigate_blocked');
navBlock === navCall + 1 // Navigate blocked right after call
```

---

### **Blocker 4: Effect Re-Run**
**Symptoms:**
- `checkClaimStatus` runs after password update
- Component re-renders to form state
- Navigate happens but state overwrites it

**Evidence:**
- Check for multiple auth events after updateUser
- Look for state changes in React DevTools

---

## 🚀 **DELIVERABLES**

### **1. Inventory Report**
✅ Prints on mount with `?claim_debug=1`  
✅ Lists all files, effects, functions, auth calls, navigation calls, guards

### **2. Diagnostic Instrumentation**
✅ Conditional logging (only with debug flag)  
✅ Event tracking via `window.CLAIM_DIAG`  
✅ Timestamped console logs  
✅ No behavior changes

### **3. Runtime Summary**
✅ Single-line summary after flow completes  
✅ Shows: tokens present, session status, updateUser status, auth events, navigate calls

### **4. Event Trace**
✅ Accessible via `window.CLAIM_DIAG.events`  
✅ Full chronological event log  
✅ Can be inspected in console

---

## 📝 **NEXT STEPS**

### **After Running Diagnostics:**

1. **Capture Console Output**
   - Copy entire console log
   - Copy `window.CLAIM_DIAG.events` array

2. **Identify Blocker**
   - Use analysis guide above
   - Find exact step where flow breaks

3. **Report Findings**
   - Include runtime summary line
   - Include relevant events from trace
   - Point to exact line/condition blocking redirect

4. **Implement Fix**
   - Based on blocker identified
   - Remove or adjust blocking condition
   - Keep diagnostic code for future debugging

---

## ⚠️ **IMPORTANT NOTES**

- **No user-visible changes** - Diagnostics are transparent
- **No behavior changes** - Existing flow unchanged
- **Performance impact** - Minimal (only when enabled)
- **Production safe** - Disabled by default
- **Cleanup** - Can be removed after fix is implemented

---

## ✅ **ACCEPTANCE CRITERIA MET**

- ✅ With `?claim_debug=1`: clear timestamped trace
- ✅ No user-visible changes
- ✅ No redirect logic changes
- ✅ Inventory report on load
- ✅ Event tracking throughout flow
- ✅ Runtime summary after completion
- ✅ Full event trace accessible in console

---

**End of Diagnostic Instrumentation**  
**Status:** Ready for testing with `?claim_debug=1`  
**Purpose:** Identify exact blocker preventing redirect after password setup
