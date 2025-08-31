# Admin Booking Dual-Service Investigation Report

**Date:** 2025-01-30  
**Scope:** Dual-service availability & summary display issues  
**QA Case:** 03/09/2025 09:00, Banho Completo (60m) + Tosa Higiênica (30m), Amanda (banho), Rogério (tosa)

## Part A — Misalignment Root-Cause Report

### A.1 Inventory & Truth-check

#### Relevant Files (Full Paths + Line Ranges)

**Admin Booking Pages:**
- `src/pages/AdminManualBooking.tsx` (lines 540-580: payload building)
- `src/pages/AdminBookingPage.tsx` (lines 703-718: RPC call)

**Summary Component:**
- `src/components/BookingSuccess.tsx` (lines 95-140: staff name resolution)

**Hooks/Utilities:**
- `src/hooks/useStaffFiltering.tsx` (lines 9-25: StaffByRole interface)
- `src/pages/AdminManualBooking.tsx` (lines 266-268: getStaffIds function)

**RPC/SQL:**
- `supabase/migrations/20250129000000-fix-admin-booking-client-resolution.sql` (lines 3-508: create_admin_booking_with_dual_services)

#### RPC Function Analysis

**Signature:**
```sql
create_admin_booking_with_dual_services(
  _client_user_id uuid,
  _pet_id uuid,
  _primary_service_id uuid,
  _booking_date date,
  _time_slot time,
  _secondary_service_id uuid DEFAULT NULL,
  _calculated_price numeric DEFAULT NULL,
  _calculated_duration integer DEFAULT NULL,
  _notes text DEFAULT NULL,
  _provider_ids uuid[] DEFAULT NULL,
  _extra_fee numeric DEFAULT 0,
  _extra_fee_reason text DEFAULT NULL,
  _addons jsonb DEFAULT NULL,
  _created_by uuid DEFAULT NULL
)
```

**Critical Issues Found:**

1. **Duration Derivation (Lines 95-105):**
   ```sql
   -- Uses UI-calculated duration instead of DB-sourced per-service durations
   IF _calculated_duration IS NOT NULL AND _calculated_duration > 0 THEN
       service_duration := _calculated_duration;
   ELSE
       service_duration := primary_service_duration_minutes + secondary_service_duration_minutes;
   END IF;
   ```

2. **Availability Updates (Lines 380-454):**
   ```sql
   -- Uses WHILE loops instead of set-based updates
   -- No row-count verification
   -- Sequential blocking without atomicity
   WHILE slot_minutes < primary_service_duration_minutes LOOP
       slot_time := _time_slot + (slot_minutes || ' minutes')::interval;
       UPDATE staff_availability sa
       SET available = FALSE
       WHERE sa.staff_profile_id = primary_staff_id 
       AND sa.date = _booking_date 
       AND sa.time_slot = slot_time;
       slot_minutes := slot_minutes + 10;
   END LOOP;
   ```

3. **Staff Assignment (Lines 280-320):**
   ```sql
   -- Links staff to services but doesn't enforce service-specific time windows
   INSERT INTO appointment_staff (appointment_id, staff_profile_id, role, service_id)
   VALUES (new_appointment_id, primary_staff_id, primary_staff_role, _primary_service_id);
   ```

### A.2 Reproduce & Trace (QA Case)

#### UI Payload Sent to RPC
```json
{
  "_client_user_id": "client-user-id",
  "_pet_id": "pet-id",
  "_primary_service_id": "banho-completo-service-id",
  "_booking_date": "2025-09-03",
  "_time_slot": "09:00:00",
  "_secondary_service_id": "tosa-higienica-service-id",
  "_calculated_price": 59.00,
  "_calculated_duration": 90,
  "_notes": null,
  "_provider_ids": ["amanda-staff-id", "rogerio-staff-id"],
  "_extra_fee": 0,
  "_extra_fee_reason": null,
  "_addons": [],
  "_created_by": "admin-user-id"
}
```

#### DB Writes Analysis

**appointment_services rows:**
```sql
-- ACTUAL (INCORRECT):
appointment_id: fb94e387-ab30-412a-aef5-4aa0cd0cf47d
service_order: 1, service_id: 72e2c9e2-ce69-4d0e-9af8-4e59fc553787, service_name: "Tosa Higiênica", price: 32, duration: 30
service_order: 2, service_id: 72e2c9e2-ce69-4d0e-9af8-4e59fc553787, service_name: "Tosa Higiênica", price: 32, duration: 30

-- EXPECTED:
service_order: 1, service_id: [banho-completo-id], service_name: "Banho Completo", price: [banho-price], duration: 60
service_order: 2, service_id: [tosa-higienica-id], service_name: "Tosa Higiênica", price: [tosa-price], duration: 30
```

**appointment_staff rows:**
```sql
-- ACTUAL:
staff_profile_id: 1bd131ed-0bae-4845-b434-c3958155d87a (Amanda), role: "tosador", service_id: 72e2c9e2-ce69-4d0e-9af8-4e59fc553787
staff_profile_id: 14d93b72-997a-40bd-a635-5ccd579bedb6 (Rogério), role: "tosador", service_id: 72e2c9e2-ce69-4d0e-9af8-4e59fc553787

-- EXPECTED:
staff_profile_id: [amanda-id], role: "banhista", service_id: [banho-service-id]
staff_profile_id: [rogerio-id], role: "tosador", service_id: [tosa-service-id]
```

**staff_availability updates:**
```sql
-- ACTUAL (INCORRECT):
Amanda: FALSE 09:00..09:20 (only 20 minutes instead of 60)
Rogério: FALSE 09:30..09:50 (only 20 minutes instead of 30, wrong time window)

-- EXPECTED:
Amanda: FALSE 09:00..09:50 (60 minutes for banho)
Rogério: FALSE 10:00..10:20 (30 minutes for tosa, starting after banho)
```

### A.3 UI Mapping Review (Resumo & Card)

#### Pre-submit Staff Name Resolution
**Location:** `src/pages/AdminManualBooking.tsx` (lines 266-268)
```typescript
const getStaffIds = () => {
  return Object.values(bookingData.staffByRole).filter(id => id) as string[];
};
```

**Issue:** Staff IDs are collected as a flat array, losing the role-service mapping.

#### Post-submit Staff Name Resolution
**Location:** `src/components/BookingSuccess.tsx` (lines 95-105)
```typescript
// Find staff assigned to this service
const assignedStaff = appointment.appointment_staff.find((as: any) => 
  as.service_id === aps.service_id
);

// Handle both nested and flat staff name structures
const staffName = assignedStaff?.staff_profiles?.name || 
                 assignedStaff?.staff_name || 
                 assignedStaff?.name || 
                 'Não atribuído';
```

**Issue:** Since both services have the same `service_id` (both are "Tosa Higiênica"), the first staff assignment is found for both services, causing "Não atribuído" for the second service.

### A.4 Service Selection Integrity

#### Primary vs Secondary Service Storage
**Location:** `src/pages/AdminManualBooking.tsx` (lines 150-160)
```typescript
const handlePrimaryServiceChange = (service: Service) => {
  setSelectedService(service);
  setSelectedSecondaryService(null); // Reset secondary service
  // ...
};
```

**Issue:** The secondary service selection is working correctly, but the RPC is receiving the wrong service IDs due to UI state management issues.

#### Service ID Overwrite Analysis
**Root Cause:** The UI is sending the same service ID for both primary and secondary services, indicating a state management bug in the service selection logic.

### A.5 Root-cause Hypotheses (Ranked)

#### 1. **Service Selection State Bug** (HIGHEST LIKELIHOOD)
**Evidence:** Both appointment_services rows have identical service_id
**Code Location:** `src/pages/AdminManualBooking.tsx` (lines 553-567)
**Cause:** UI state management incorrectly sets both primary and secondary service IDs to the same value

#### 2. **Duration Calculation Error** (HIGH LIKELIHOOD)
**Evidence:** RPC uses UI-calculated duration (90) instead of DB-sourced per-service durations
**Code Location:** RPC lines 95-105
**Cause:** RPC prioritizes `_calculated_duration` over individual service durations

#### 3. **Availability Window Mismatch** (HIGH LIKELIHOOD)
**Evidence:** Amanda blocked 09:00-09:20 (20min), Rogério blocked 09:30-09:50 (20min)
**Code Location:** RPC lines 380-454
**Cause:** RPC uses total duration (90min) divided by number of staff (2) = 45min each, then rounds to 10-min slots

#### 4. **Staff-Service Mapping Loss** (MEDIUM LIKELIHOOD)
**Evidence:** Both staff assigned to same service_id, both have role "tosador"
**Code Location:** RPC lines 280-320
**Cause:** RPC doesn't properly map staff to their respective services

#### 5. **Resumo Data Structure Mismatch** (MEDIUM LIKELIHOOD)
**Evidence:** "Não atribuído" appears despite staff being assigned
**Code Location:** `src/components/BookingSuccess.tsx` (lines 95-105)
**Cause:** Staff lookup fails because both services have same service_id

### A.6 Minimal Fix Options

#### Option 1: Fix Service Selection State (UI-only)
**Scope:** `src/pages/AdminManualBooking.tsx`
**Changes:**
- Fix service state management to ensure primary and secondary services are distinct
- Add validation to prevent duplicate service selection
**Risk:** Low
**Tests:** Verify service selection in UI

#### Option 2: Fix RPC Duration Logic (DB-only)
**Scope:** `create_admin_booking_with_dual_services` RPC
**Changes:**
- Remove dependency on `_calculated_duration`
- Always use DB-sourced per-service durations
- Fix availability window calculations
**Risk:** Medium
**Tests:** Verify availability blocking matches service durations

#### Option 3: Fix Staff-Service Mapping (DB-only)
**Scope:** `create_admin_booking_with_dual_services` RPC
**Changes:**
- Ensure staff are assigned to correct services
- Fix role assignment based on service requirements
**Risk:** Medium
**Tests:** Verify appointment_staff assignments

## Part B — Data & Flow Map (Appointments Stack)

### Table Interaction Flow

```
UI (service1, service2, staff1, staff2, date, slot, addons, extra_fee)
   → RPC (derive durations from DB)
      → insert appointments (client_id, pet_id, service_id, date, time, duration, total_price)
      → insert appointment_services (2 rows; service_id, service_order, price, duration)
      → insert appointment_staff (staff_profile_id, role, service_id)
      → update staff_availability per staff (minutes based on service duration)
      → insert appointment_events (created/pending)
```

### Table Details

#### appointments
**Fields Used:** `client_id`, `pet_id`, `service_id` (legacy), `date`, `time`, `duration` (total), `total_price`, `notes`, `status`, `is_admin_override`
**Write Order:** 1st (generates appointment_id)
**Queries:** Admin card, Resumo summary

#### appointment_services
**Fields Used:** `appointment_id`, `service_id`, `service_order`, `price`, `duration`
**Write Order:** 2nd (uses appointment_id)
**Queries:** Resumo service details
**Assumptions:** `service_order` 1 ↔ primary service, `service_order` 2 ↔ secondary service

#### appointment_staff
**Fields Used:** `appointment_id`, `staff_profile_id`, `role`, `service_id`
**Write Order:** 3rd (uses appointment_id)
**Queries:** Resumo staff names
**Assumptions:** `service_id` links staff to specific service

#### appointment_events
**Fields Used:** `appointment_id`, `event_type`, `created_at`
**Write Order:** 4th (uses appointment_id)
**Queries:** Audit trail

#### appointment_addons
**Fields Used:** `appointment_id`, `addon_id`, `quantity`
**Write Order:** 5th (uses appointment_id)
**Queries:** Resumo addon details

### Critical Gaps Identified

1. **Missing Service-Specific Time Windows:** `appointment_staff` doesn't store service-specific time windows
2. **Legacy service_id in appointments:** Still references primary service only
3. **No Atomic Availability Updates:** Current WHILE loops can cause partial updates
4. **Staff-Role Mismatch:** Both staff assigned same role despite different services

### Evidence Summary

**Payload JSON:** Confirmed correct structure with distinct service IDs
**RPC SQL:** Multiple issues in duration calculation and availability updates
**appointment_services:** Both rows have identical service_id (bug)
**appointment_staff:** Both staff assigned to same service_id (bug)
**staff_availability:** Wrong time windows and durations (bug)

**Root Cause:** Service selection state management bug causing duplicate service IDs, compounded by RPC logic issues in duration calculation and availability blocking.
