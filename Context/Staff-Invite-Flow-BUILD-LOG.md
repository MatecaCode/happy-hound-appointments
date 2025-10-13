# Staff Invite & Claim Flow - Complete Build Log
**Date:** October 8, 2025  
**Status:** ✅ COMPLETED & WORKING  
**Project:** Vettale Pet Grooming System

---

## 🎯 **OVERVIEW**

This document provides a comprehensive log of the **Staff Invite & Claim Flow** implementation, including all changes, fixes, and the final working mechanism. This flow allows administrators to create staff profiles and send invite emails, enabling staff members to claim their accounts by setting passwords.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Flow Overview:**
1. **Admin creates staff profile** → Database record created
2. **Admin clicks "Enviar Setup"** → Edge Function sends invite email
3. **Staff receives email** → Clicks claim link
4. **Staff sets password** → Account claimed and linked
5. **Staff can access profile** → Full system access

### **Key Components:**
- **Frontend:** React/TypeScript with Supabase client
- **Backend:** Supabase Edge Functions with service role
- **Database:** PostgreSQL with triggers and citext extension
- **Auth:** Supabase Auth with custom email templates
- **Email:** Supabase native email system

---

## 📁 **FILES MODIFIED**

### **1. Edge Functions**
- `supabase/functions/send-staff-invite/index.ts` (Version 49 - Final)

### **2. Frontend Components**
- `src/pages/AdminSettings.tsx` (Staff management UI)
- `src/pages/StaffClaim.tsx` (Password setup page)

### **3. Database Migrations**
- `fix_staff_email_confirmation_trigger` 
- `convert_staff_email_to_citext`
- `update_staff_trigger_for_citext`

### **4. Configuration**
- Supabase Auth URL Configuration
- Email Templates (Reset Password)

---

## 🔧 **DETAILED IMPLEMENTATION**

### **1. Edge Function: `send-staff-invite`**

**Purpose:** Sends staff invite emails using Supabase's native auth system

**Key Features:**
- ✅ Service role authentication
- ✅ CORS-compliant headers
- ✅ Email normalization (lowercase, trimmed)
- ✅ Existing user cleanup
- ✅ Production URL handling
- ✅ Error handling with detailed logging

**Final Implementation (Version 49):**
```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, staff_profile_id } = await req.json();
    console.log(`[STAFF_INVITE_PROD] Processing ${email} with ID ${staff_profile_id}`);
    
    if (!email || !staff_profile_id) {
      return new Response(JSON.stringify({ 
        error: "Email and staff_profile_id are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[STAFF_INVITE_PROD] Normalized email: ${normalizedEmail}`);

    // Verify staff profile exists
    const { data: staff, error: staffErr } = await admin
      .from("staff_profiles")
      .select("id, email")
      .eq("id", staff_profile_id)
      .single();

    if (staffErr || !staff) {
      console.error(`[STAFF_INVITE_PROD] Staff not found:`, staffErr);
      return new Response(JSON.stringify({ 
        error: "Staff profile not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[STAFF_INVITE_PROD] Staff found, cleaning up any existing auth users...`);

    // Clean up: Delete any existing auth users with this email
    try {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const userToDelete = existingUsers?.users?.find(u => 
        u.email?.toLowerCase() === normalizedEmail
      );
      
      if (userToDelete) {
        console.log(`[STAFF_INVITE_PROD] Deleting existing user: ${userToDelete.id}`);
        await admin.auth.admin.deleteUser(userToDelete.id);
        console.log(`[STAFF_INVITE_PROD] Existing user deleted`);
      }
    } catch (e) {
      console.log(`[STAFF_INVITE_PROD] No existing user to delete`);
    }

    // Use production URL for staff claim
    const redirectUrl = "https://vettale.shop/staff/claim";
    console.log(`[STAFF_INVITE_PROD] Using redirect URL: ${redirectUrl}`);

    // Use Supabase's native invite system
    console.log(`[STAFF_INVITE_PROD] Sending native Supabase invite...`);
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: redirectUrl,
        data: { staff_profile_id, type: 'staff_setup' }
      }
    );

    if (inviteErr) {
      console.error(`[STAFF_INVITE_PROD] Native invite failed:`, inviteErr);
      return new Response(JSON.stringify({ 
        error: `Failed to send invite: ${inviteErr.message}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[STAFF_INVITE_PROD] Native invite sent successfully:`, inviteData?.user?.id);
    
    // Update staff profile
    const { error: updateErr } = await admin
      .from("staff_profiles")
      .update({ 
        claim_invited_at: new Date().toISOString()
      })
      .eq("id", staff_profile_id);

    if (updateErr) {
      console.error(`[STAFF_INVITE_PROD] Update failed:`, updateErr);
    } else {
      console.log(`[STAFF_INVITE_PROD] Staff profile updated`);
    }

    return new Response(JSON.stringify({ 
      status: "success",
      message: "Invite sent successfully",
      user_id: inviteData?.user?.id,
      redirect_url: redirectUrl
    }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(`[STAFF_INVITE_PROD] Unexpected error:`, e);
    return new Response(JSON.stringify({ 
      error: `Unexpected error: ${e?.message || 'Unknown error'}`
    }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
```

### **2. Frontend: AdminSettings.tsx**

**Purpose:** Admin interface for creating staff and sending invites

**Key Changes:**
- ✅ Automatic invite sending after staff creation
- ✅ Email normalization (lowercase)
- ✅ Case-insensitive duplicate checking
- ✅ Direct fetch() calls for better error handling
- ✅ Detailed error logging and user feedback

**Critical Functions:**
```typescript
const sendStaffInvite = async (staffProfile: StaffProfile) => {
  const toastId = `send-setup-${staffProfile.id}`;
  try {
    setResendingSetupFor(staffProfile.id);
    
    // Use fetch directly to get better error details
    const response = await fetch(`https://ieotixprkfglummoobkb.supabase.co/functions/v1/send-staff-invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: staffProfile.email.trim().toLowerCase(),
        staff_profile_id: staffProfile.id,
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    toast.success("Setup enviado 🎉", { id: toastId });
    fetchStaff(); // Refresh to show updated status
  } catch (e: any) {
    console.error("[SEND_STAFF_SETUP] error", e);
    toast.error(e?.message ?? "Falha ao enviar setup", { id: toastId });
  } finally {
    setResendingSetupFor(null);
  }
};

const handleCreateStaff = async () => {
  // ... staff creation logic with email normalization ...
  
  // Send invitation email automatically
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-staff-invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: staffData.email.trim().toLowerCase(),
        staff_profile_id: staffData.id,
      }),
    });

    const responseData = await response.json();
    
    if (!response.ok || responseData?.error) {
      toast.success('Staff criado com sucesso!', {
        description: `Falha ao enviar convite: ${responseData?.error || 'Erro desconhecido'}. Use o botão "Enviar Setup" para reenviar.`,
      });
    } else {
      toast.success('Staff criado com sucesso! 🎉', {
        description: `Convite enviado para ${staffData.email}`,
      });
    }
  } catch (inviteErr) {
    toast.success('Staff criado com sucesso!', {
      description: 'Falha ao enviar convite automaticamente. Use o botão "Enviar Setup" para reenviar.',
    });
  }
};
```

### **3. Frontend: StaffClaim.tsx**

**Purpose:** Staff password setup and account claiming

**Key Features:**
- ✅ Robust session processing from URL
- ✅ Multiple fallback methods for session retrieval
- ✅ Detailed error messages
- ✅ Password strength validation

**Session Processing Logic:**
```typescript
const processSession = async () => {
  try {
    setIsProcessing(true);
    console.log('[STAFF_CLAIM] Processing session from URL...');
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    console.log('[STAFF_CLAIM] Hash params:', Object.fromEntries(hashParams));
    console.log('[STAFF_CLAIM] Search params:', Object.fromEntries(searchParams));

    // Method 1: Try setSession with tokens from hash
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      console.log('[STAFF_CLAIM] Found tokens in hash, attempting setSession...');
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (!sessionError && sessionData?.session) {
        console.log('[STAFF_CLAIM] Session set successfully via setSession');
        setSession(sessionData.session);
        setIsProcessing(false);
        return;
      }
    }

    // Method 2: Try getSessionFromUrl
    console.log('[STAFF_CLAIM] Trying getSessionFromUrl...');
    const { data: urlSessionData, error: urlError } = await supabase.auth.getSessionFromUrl();
    
    if (!urlError && urlSessionData?.session) {
      console.log('[STAFF_CLAIM] Session retrieved via getSessionFromUrl');
      setSession(urlSessionData.session);
      setIsProcessing(false);
      return;
    }

    // Method 3: Check existing session
    console.log('[STAFF_CLAIM] Checking existing session...');
    const { data: existingSessionData } = await supabase.auth.getSession();
    
    if (existingSessionData?.session) {
      console.log('[STAFF_CLAIM] Found existing session');
      setSession(existingSessionData.session);
      setIsProcessing(false);
      return;
    }

    console.log('[STAFF_CLAIM] No valid session found, but allowing password setup attempt');
    setIsProcessing(false);
  } catch (error) {
    console.error('[STAFF_CLAIM] Session processing error:', error);
    setIsProcessing(false);
  }
};
```

### **4. Database Migrations**

**Migration 1: `fix_staff_email_confirmation_trigger`**
```sql
-- Fix the trigger function to properly handle email comparison without citext casting issues
CREATE OR REPLACE FUNCTION link_staff_when_email_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  -- act only when confirmation is set
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := LOWER(TRIM(NEW.email));
  v_user_id := NEW.id;

  -- Link staff profile(s) with matching email that are not yet linked
  -- Use LOWER() for case-insensitive comparison instead of citext casting
  UPDATE public.staff_profiles
     SET user_id = v_user_id,
         claimed_at = now()
   WHERE LOWER(TRIM(email)) = v_email
     AND (user_id IS NULL OR user_id <> v_user_id);

  RETURN NEW;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Migration 2: `convert_staff_email_to_citext`**
```sql
-- Convert staff_profiles.email to citext for proper case-insensitive handling
ALTER TABLE public.staff_profiles 
ALTER COLUMN email TYPE public.citext;
```

**Migration 3: `update_staff_trigger_for_citext`**
```sql
-- Update the trigger function to use citext properly now that the column is citext
CREATE OR REPLACE FUNCTION link_staff_when_email_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_email public.citext;
  v_user_id uuid;
BEGIN
  -- act only when confirmation is set
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := NEW.email::public.citext;
  v_user_id := NEW.id;

  -- Link staff profile(s) with matching email that are not yet linked
  UPDATE public.staff_profiles
     SET user_id = v_user_id,
         claimed_at = now()
   WHERE email = v_email
     AND (user_id IS NULL OR user_id <> v_user_id);

  RETURN NEW;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🐛 **CRITICAL ISSUES RESOLVED**

### **Issue 1: "Error confirming user" Message**
**Root Cause:** Database trigger function `link_staff_when_email_confirmed()` was failing due to `citext` type casting issues.

**Symptoms:**
- ❌ Email confirmation failed with database error
- ❌ Users saw "Error confirming user" message
- ❌ Staff profiles weren't linked to auth users

**Solution:**
1. Fixed trigger function to handle `citext` properly
2. Converted `staff_profiles.email` column to `citext` type
3. Updated function to use `public.citext` schema reference

### **Issue 2: Case Sensitivity in Email Handling**
**Root Cause:** Email comparisons were case-sensitive, causing mismatches.

**Solution:**
1. Normalized all emails to lowercase in Edge Function
2. Used `citext` type for case-insensitive database storage
3. Updated UI to use case-insensitive queries (`ilike`)

### **Issue 3: Edge Function CORS and Error Handling**
**Root Cause:** Poor error handling and CORS issues prevented proper debugging.

**Solution:**
1. Implemented comprehensive CORS headers
2. Added detailed logging throughout the flow
3. Used direct `fetch()` calls for better error visibility
4. Added proper error responses with status codes

---

## 🔧 **CONFIGURATION REQUIREMENTS**

### **Supabase Dashboard Settings**
1. **Authentication → URL Configuration:**
   - **Site URL:** `https://vettale.shop`
   - **Additional Redirect URLs:** `https://vettale.shop/staff/claim`

2. **Email Templates:**
   - **Template Used:** "Reset Password" 
   - **Custom HTML:** Provided for branded email experience

3. **Extensions:**
   - **Required:** `citext` extension (already installed)

### **Environment Variables**
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for Edge Functions
- `VITE_SUPABASE_URL`: Client-side project URL
- `VITE_SUPABASE_ANON_KEY`: Client-side anonymous key

---

## 📊 **TESTING CHECKLIST**

### **Complete Flow Test:**
- ✅ Admin creates staff profile
- ✅ Staff profile appears in admin list
- ✅ "Enviar Setup" button sends email
- ✅ Email received with correct link
- ✅ Link redirects to `/staff/claim` page
- ✅ Password setup form works
- ✅ Account claimed successfully
- ✅ Staff can access their profile
- ✅ No "Error confirming user" message

### **Edge Cases Tested:**
- ✅ Duplicate email handling
- ✅ Case-insensitive email matching
- ✅ Existing auth user cleanup
- ✅ Network error handling
- ✅ Invalid staff profile IDs
- ✅ Malformed email addresses

---

## 🚀 **DEPLOYMENT NOTES**

### **Production Deployment:**
1. **Edge Function:** Deployed as version 49 to Supabase
2. **Database Migrations:** Applied successfully
3. **Frontend:** Deployed to Vercel with latest changes
4. **Configuration:** Updated in Supabase Dashboard

### **Monitoring:**
- **Logs:** Available in Supabase Dashboard → Edge Functions
- **Auth Logs:** Available in Supabase Dashboard → Authentication → Logs
- **Database Logs:** Available in Supabase Dashboard → Database → Logs

---

## 📚 **TECHNICAL DEPENDENCIES**

### **Frontend:**
- React 18+
- TypeScript
- Supabase JS Client v2
- React Router DOM
- Sonner (for toasts)

### **Backend:**
- Supabase Edge Functions (Deno runtime)
- PostgreSQL with citext extension
- Supabase Auth system

### **Email System:**
- Supabase native email service
- Custom "Reset Password" template
- SMTP configuration handled by Supabase

---

## 🔄 **MAINTENANCE GUIDELINES**

### **Regular Checks:**
1. **Monitor auth logs** for any new citext-related errors
2. **Test email delivery** periodically
3. **Verify redirect URLs** remain correct
4. **Check Edge Function logs** for performance issues

### **Future Enhancements:**
1. **Email template customization** for better branding
2. **Bulk staff invite** functionality
3. **Staff role management** integration
4. **Email delivery status** tracking

---

## 📝 **LESSONS LEARNED**

### **Key Insights:**
1. **Database triggers** require careful type handling, especially with extensions
2. **Supabase Auth logs** are invaluable for debugging auth flows
3. **citext extension** must be properly referenced with schema (`public.citext`)
4. **Direct fetch() calls** provide better error visibility than Supabase client functions
5. **Email normalization** is critical for reliable matching

### **Best Practices Established:**
1. Always use `citext` for email columns
2. Normalize emails to lowercase in all operations
3. Implement comprehensive error handling in Edge Functions
4. Use detailed logging for debugging complex flows
5. Test database triggers thoroughly before deployment

---

## ✅ **FINAL STATUS**

**✅ FULLY FUNCTIONAL AND DEPLOYED**

The Staff Invite & Claim Flow is now completely working in production. Staff members can successfully:
1. Receive invite emails from administrators
2. Click email links to access the claim page
3. Set their passwords to claim accounts
4. Access their staff profiles and system features

**No more "Error confirming user" messages!** 🎉

---

**End of Build Log**  
**Total Development Time:** ~8 hours of debugging and implementation  
**Final Result:** Production-ready staff onboarding system
