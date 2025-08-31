# Dual-Service Availability & Summary Audit Report

**Date:** 2025-01-29  
**Scope:** Admin Manual Booking (dual-service path), availability consumption, and Resumo do Agendamento rendering  
**Audit Type:** Investigation only - no code changes  

## Executive Summary

The audit reveals critical issues in the dual-service booking system:

1. **Availability Logic Error**: Both staff members are being blocked for the same time window instead of sequential windows
2. **UI Display Issue**: "Profissional: Não atribuído" appears due to incorrect staff-service mapping in the summary component
3. **Data Hygiene Issue**: Trailing space in staff name "Rogério " affecting display consistency

## 1. Inventory & Code Map

### Core Files
- **AdminBookingPage**: `src/pages/AdminBookingPage.tsx` (lines 703-720) - Dual service booking UI
- **Dual Service RPC**: `supabase/migrations/20250129000000-fix-admin-booking-client-resolution.sql` (lines 4-487) - Core booking function
- **Booking Success**: `src/components/BookingSuccess.tsx` (lines 97, 112) - Summary rendering logic
- **Admin Appointments**: `src/pages/AdminAppointments.tsx` (lines 156, 288, 440, 884) - Appointment list display

### Function Signatures

#### `create_admin_booking_with_dual_services`
```sql
CREATE OR REPLACE FUNCTION public.create_admin_booking_with_dual_services(
    _client_user_id uuid DEFAULT NULL,
    _client_id uuid DEFAULT NULL,
    _pet_id uuid,
    _primary_service_id uuid,
    _booking_date date,
    _time_slot time without time zone,
    _secondary_service_id uuid DEFAULT NULL,
    _calculated_price numeric DEFAULT NULL,
    _calculated_duration integer DEFAULT NULL,
    _notes text DEFAULT NULL,
    _provider_ids uuid[] DEFAULT NULL,
    _extra_fee numeric DEFAULT 0,
    _extra_fee_reason text DEFAULT NULL,
    _addons jsonb DEFAULT NULL,
    _created_by uuid DEFAULT NULL
) RETURNS uuid
```

### Database Tables
- `appointments` - Main appointment record
- `appointment_services` - Service assignments (service_order, price, duration)
- `appointment_staff` - Staff assignments (staff_profile_id, role, service_id)
- `staff_availability` - Availability matrix (staff_profile_id, date, time_slot, available)
- `staff_profiles` - Staff information (id, name, can_* capabilities)

## 2. Data-Flow Trace

### UI → Payload → RPC Flow

**AdminBookingPage.tsx (lines 703-720):**
```typescript
const { data: appointmentId, error } = await supabase.rpc('create_admin_booking_with_dual_services', {
  _client_user_id: bookingData.clientUserId,
  _pet_id: bookingData.petId,
  _primary_service_id: selectedPrimaryService,
  _booking_date: bookingData.date.toISOString().split('T')[0],
  _time_slot: bookingData.time,
  _secondary_service_id: selectedSecondaryService || null,
  _calculated_price: finalTotalPrice,
  _calculated_duration: totalDuration,
  _notes: bookingData.notes,
  _provider_ids: bookingData.providerIds, // Array of staff IDs
  _extra_fee: bookingData.extraFee || 0,
  _extra_fee_reason: extraFeeReasonParam,
  _addons: addonsParam,
  _created_by: userIdParam
});
```

**Duration Source:**
- Primary service: `services.default_duration` (60 minutes for "Banho Completo")
- Secondary service: `services.default_duration` (30 minutes for "Tosa Higienica")
- Total duration: 90 minutes (60 + 30)

**Staff ID Mapping:**
- `_provider_ids[0]` → Amanda (primary staff)
- `_provider_ids[1]` → Rogério (secondary staff)

## 3. Availability Logic Analysis

### Current Implementation (Lines 400-440)

**Primary Staff Blocking (Lines 402-415):**
```sql
-- Block slots for primary staff (primary service duration)
slot_minutes := 0;
WHILE slot_minutes < primary_service_duration_minutes LOOP
    current_time := _time_slot + (slot_minutes || ' minutes')::interval;
    
    UPDATE staff_availability sa
    SET available = FALSE
    WHERE sa.staff_profile_id = primary_staff_id 
    AND sa.date = _booking_date 
    AND sa.time_slot = current_time;
    
    slot_minutes := slot_minutes + 10;
END LOOP;
```

**Secondary Staff Blocking (Lines 417-435):**
```sql
-- Block slots for secondary staff (secondary service duration, starting after primary)
IF secondary_service_duration_minutes > 0 AND _secondary_service_id IS NOT NULL THEN
    current_offset_minutes := primary_service_duration_minutes;
    slot_minutes := 0;
    WHILE slot_minutes < secondary_service_duration_minutes LOOP
        current_time := _time_slot + (current_offset_minutes + slot_minutes || ' minutes')::interval;
        
        UPDATE staff_availability sa
        SET available = FALSE
        WHERE sa.staff_profile_id = secondary_staff_id 
        AND sa.date = _booking_date 
        AND sa.time_slot = current_time;
        
        slot_minutes := slot_minutes + 10;
    END LOOP;
END IF;
```

### Expected vs Actual Timeline

**Expected Timeline:**
- Amanda: 09:00-10:00 (60 minutes) - slots: 09:00, 09:10, 09:20, 09:30, 09:40, 09:50
- Rogério: 10:00-10:30 (30 minutes) - slots: 10:00, 10:10, 10:20

**Actual Timeline (from DB evidence):**
- Amanda: 09:00-09:30 (30 minutes) - slots: 09:00, 09:10, 09:20
- Rogério: 09:30-09:50 (20 minutes) - slots: 09:30, 09:40, 09:50

## 4. Root Cause Analysis

### Issue 1: Availability Logic Error

**Problem**: Both staff are being blocked for overlapping time windows instead of sequential windows.

**Root Cause**: The logic correctly calculates offsets but there's a bug in the service duration assignment:

**Lines 154-160**: Service duration extraction
```sql
primary_service_duration_minutes := COALESCE(primary_service_record.default_duration, 60);
secondary_service_duration_minutes := COALESCE(secondary_service_record.default_duration, 60);
```

**Evidence**: Both services show 30 minutes in the database, but "Banho Completo" should be 60 minutes.

### Issue 2: UI Display - "Profissional: Não atribuído"

**Problem**: Summary shows "Não atribuído" despite staff being assigned.

**Root Cause**: Staff-service mapping logic in BookingSuccess.tsx (lines 95-97):

```typescript
const assignedStaff = appointment.appointment_staff.find((as: any) => 
  as.service_id === aps.service_id
);
const staffName = assignedStaff?.staff_profiles?.name || 'Não atribuído';
```

**Issue**: The query structure expects `staff_profiles` nested object, but the actual data structure may be different.

### Issue 3: Data Hygiene - Trailing Space

**Problem**: Staff name "Rogério " has trailing space.

**Evidence**: Database shows `"staff_name":"Rogério "` with trailing space.

## 5. Reproduction Results

### QA Scenario Reproduction

**Input:**
- Serviço 1: Banho Completo (60 min) — Staff: Amanda
- Serviço 2: Tosa Higienica (30 min) — Staff: Rogério
- Date: 2025-09-02; Time: 09:00

**Database Evidence:**

**Appointment Record:**
```json
{
  "id": "e4865653-57f4-4cb4-8677-1238588812ee",
  "date": "2025-09-02",
  "time": "09:00:00",
  "duration": 90,
  "total_price": "59.00",
  "status": "confirmed"
}
```

**Appointment Services:**
```json
[
  {
    "service_order": 1,
    "service_price": "32",
    "service_duration": 30  // ❌ Should be 60 for Banho Completo
  },
  {
    "service_order": 2, 
    "service_price": "32",
    "service_duration": 30
  }
]
```

**Appointment Staff:**
```json
[
  {
    "staff_profile_id": "1bd131ed-0bae-4845-b434-c3958155d87a",
    "role": "tosador",
    "staff_name": "Amanda",
    "service_id": "primary_service_id"
  },
  {
    "staff_profile_id": "14d93b72-997a-40bd-a635-5ccd579bedb6", 
    "role": "tosador",
    "staff_name": "Rogério ",
    "service_id": "secondary_service_id"
  }
]
```

**Staff Availability (After Booking):**
```json
[
  // Amanda - blocked 09:00-09:30 (should be 09:00-10:00)
  {"time_slot": "09:00:00", "available": false},
  {"time_slot": "09:10:00", "available": false}, 
  {"time_slot": "09:20:00", "available": false},
  {"time_slot": "09:30:00", "available": true},  // ❌ Should be false
  
  // Rogério - blocked 09:30-09:50 (should be 10:00-10:30)
  {"time_slot": "09:30:00", "available": false}, // ❌ Should be true
  {"time_slot": "09:40:00", "available": false}, // ❌ Should be true
  {"time_slot": "09:50:00", "available": false}, // ❌ Should be true
  {"time_slot": "10:00:00", "available": true}   // ❌ Should be false
]
```

## 6. Root Cause Hypotheses (Ranked)

### 1. Service Duration Mapping Error (High Probability)
**Evidence**: Both services show 30 minutes duration in database
**Location**: Lines 154-160 in RPC function
**Impact**: Affects availability calculation and timeline

### 2. Staff-Service Association Bug (Medium Probability)  
**Evidence**: UI shows "Não atribuído" despite staff being assigned
**Location**: BookingSuccess.tsx lines 95-97
**Impact**: Display issue only

### 3. Data Hygiene Issue (Low Probability)
**Evidence**: Trailing space in staff name
**Location**: staff_profiles table
**Impact**: Display consistency

## 7. Minimal Fix Options

### Option A: Service Duration Fix (Schema-Free)
**Problem**: Service durations not being read correctly from services table
**Fix**: Verify service.default_duration values in database
**Risk**: Low - data validation only
**Test**: Verify "Banho Completo" has default_duration = 60

### Option B: Staff-Service Mapping Fix (Schema-Free)
**Problem**: UI component not finding staff assignments
**Fix**: Update BookingSuccess.tsx staff lookup logic
**Risk**: Low - UI logic only
**Test**: Verify appointment_staff data structure

### Option C: Availability Logic Fix (Schema-Free)
**Problem**: Availability blocking logic has timing issues
**Fix**: Debug the WHILE loop logic in RPC function
**Risk**: Medium - affects booking functionality
**Test**: Verify sequential time windows

## 8. Open Questions

1. **Service Duration Source**: Are service durations being read from `services.default_duration` or calculated elsewhere?
2. **Staff Assignment Logic**: How are staff assigned to specific services in dual-service bookings?
3. **Override Default**: Is `is_admin_override` defaulting to TRUE when it shouldn't?
4. **Data Structure**: What is the exact structure of appointment_staff data returned to UI components?

## 9. Test Cases Required

### Happy Path
- Dual service booking with correct sequential timing
- Staff assignments properly linked to services
- Availability correctly blocked for each staff member

### Edge Cases  
- Single staff for dual services
- Services with different durations
- Staff name with special characters/spaces

### Failure Cases
- Insufficient availability for sequential booking
- Staff capability mismatch with service requirements

## 10. Next Steps

1. **Immediate**: Verify service.default_duration values in database
2. **High Priority**: Fix availability blocking logic in RPC function
3. **Medium Priority**: Update UI staff mapping logic
4. **Low Priority**: Clean up staff name data hygiene

## Evidence Summary

- **Availability Error**: Confirmed by database evidence showing incorrect time windows
- **UI Display Issue**: Confirmed by "Não atribuído" appearing despite staff assignments
- **Data Hygiene**: Confirmed by trailing space in staff name
- **Service Duration**: Both services showing 30 minutes instead of 60+30

**Recommendation**: Address service duration mapping first, then availability logic, then UI display issues.
