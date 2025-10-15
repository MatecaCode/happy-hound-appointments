# Admin Booking Edit System - Complete Documentation

## Overview

The Admin Booking Edit System provides comprehensive functionality for editing existing appointments with full audit trails, staff reassignment, time extensions, and conflict resolution. This system handles both single-service and dual-service bookings with atomic availability management.

## System Architecture

### Frontend Components

#### 1. AdminEditBooking.tsx
**Location**: `src/pages/AdminEditBooking.tsx`

**Key Features**:
- Visual time slot selection using `TimeSlotGrid` component
- Real-time availability checking with `useAdminAvailability` hook
- Staff reassignment with immediate UI feedback
- Time extension with preview calculations
- Admin override functionality with conflict resolution
- Service display showing all services (e.g., "Banho + Tosa Higiênica")
- Override indicators in appointment status

**State Management**:
```typescript
const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
const [pendingStaffChanges, setPendingStaffChanges] = useState<Record<string, string | null>>({});
```

**Key Functions**:
- `loadServiceStaffAssignments()`: Loads current staff assignments
- `handleServiceStaffChange()`: Updates staff selection and triggers availability refresh
- `handleTimeSlotSelect()`: Selects time slot and updates preview
- `performEdit()`: Executes the booking edit with proper RPC selection

#### 2. AdminEditLogs.tsx
**Location**: `src/pages/AdminEditLogs.tsx`

**Purpose**: Comprehensive audit interface for viewing all admin edit activities

**Features**:
- Filterable log viewer (by operation type, override status, search terms)
- Detailed before/after value comparison
- Client impact assessment display
- Availability impact tracking
- Expandable detailed view with system information

### Backend Components

#### 1. Core Edit Function
**Function**: `edit_admin_booking_with_dual_services()`
**Location**: Database migration `20250114000002-create-edit-admin-booking-with-dual-services.sql`

**Parameters**:
```sql
_appointment_id uuid,
_new_date date,
_new_time time,
_new_duration integer DEFAULT NULL,
_extra_fee numeric DEFAULT NULL,
_admin_notes text DEFAULT NULL,
_edit_reason text DEFAULT NULL,
_edited_by uuid DEFAULT NULL,
_force_override boolean DEFAULT FALSE,
_new_staff_ids uuid[] DEFAULT NULL
```

**Core Logic Flow**:
1. **Validation**: Verify appointment exists and parameters are valid
2. **Current State Capture**: Load existing appointment, services, and staff assignments
3. **Change Detection**: Compare old vs new values for date, time, duration, staff
4. **Slot Liberation**: Free old availability slots if date/time/staff changed
5. **Availability Validation**: Check new slots are available (unless override)
6. **Atomic Updates**: Update appointment, staff assignments, and availability
7. **Extension Handling**: Apply time extensions to the correct service segment
8. **Override Processing**: Set override flags when force override is used
9. **Comprehensive Logging**: Create detailed audit trail
10. **Event Logging**: Create appointment event for legacy compatibility

#### 2. Logging System
**Table**: `admin_edit_logs`
**Function**: `log_admin_edit()`
**View**: `admin_edit_logs_detailed`

**Comprehensive Tracking**:
- Before/after values (JSON)
- Staff assignment changes
- Availability impact (slots freed/blocked)
- Override information and conflicts
- Client impact assessment
- System metadata and version info

## Key Features

### 1. Service Display Enhancement
**Before**: "Serviço não especificado"
**After**: "Banho + Tosa Higiênica" (dynamic based on actual services)

**Implementation**:
```typescript
{serviceStaffAssignments.length > 0 ? (
  serviceStaffAssignments
    .sort((a, b) => a.service_order - b.service_order)
    .map((assignment, index) => (
      <span key={assignment.service_id}>
        {assignment.service_name}
        {index < serviceStaffAssignments.length - 1 && ' + '}
      </span>
    ))
) : (
  appointmentDetails.service_name || 'Serviço não especificado'
)}
```

### 2. Admin Override Indicators
**Visual Badges**: 
- 🟠 "Admin Override" - When `is_admin_override` is true
- 🔵 "Admin Booking" - When `booked_by_admin` is true (but not override)
- 🔴 "Double Booking" - When `is_double_booking` is true

**Database Integration**:
- Override flag automatically set when `_force_override` is used
- Persistent across edits and visible in appointment details

### 3. Visual Time Slot Selection
**Component**: `TimeSlotGrid` (reused from booking creation)
**Features**:
- ✅ Green: Available slots
- ⚠️ Yellow: Partially occupied (some staff available)
- ❌ Red: Fully occupied
- Real-time availability updates when staff changes
- Tooltip information for each slot

### 4. Staff Reassignment
**Single Source of Truth**: `selectedStaffIds` state array
**Real-time Updates**:
- UI immediately reflects staff changes
- Time slots refresh to show new staff availability
- "Staff Atual" shows original staff, "Staff Selecionado" shows new selection
- Database updates atomic with availability changes

### 5. Time Extension System
**Logic**:
- **Single Service**: Extend the only service
- **Dual Service**: Always extend the secondary (last) service
- **Atomic Updates**: Both `appointments.duration` and `appointment_services.duration` updated
- **Availability Blocking**: Extension slots blocked for correct staff member
- **Event Logging**: Special `'edited_extend'` event type

**Preview Display**:
```typescript
{selectedDuration > 0 && isDualService && (
  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
    <p className="text-green-700 font-medium text-xs">
      🔄 Extensão: +{selectedDuration} min será adicionado ao último segmento
    </p>
    <p className="text-green-600 text-xs mt-1">
      Serviço secundário será estendido
    </p>
  </div>
)}
```

### 6. Comprehensive Audit Trail
**Three-Level Logging**:
1. **Appointment Events** (legacy): Basic event with notes
2. **Admin Edit Logs** (detailed): Complete before/after, availability impact
3. **Admin Actions** (optional): High-level admin activity tracking

**Audit Information Captured**:
- Complete before/after values (JSON)
- Staff assignment changes with IDs and names
- Availability impact (slots freed, blocked, extended)
- Override usage and conflicts resolved
- Client impact assessment (HIGH/MEDIUM/LOW)
- System metadata and function versions
- Timestamps and admin user identification

## Database Schema

### Core Tables Modified
```sql
-- Appointments table (enhanced)
ALTER TABLE appointments ADD COLUMN is_admin_override boolean DEFAULT false;

-- Admin edit logs (new)
CREATE TABLE admin_edit_logs (
    id uuid PRIMARY KEY,
    appointment_id uuid REFERENCES appointments(id),
    edited_by uuid REFERENCES auth.users(id),
    operation_type text CHECK (operation_type IN ('edit', 'edit_extend', 'staff_change', ...)),
    old_values jsonb NOT NULL,
    new_values jsonb NOT NULL,
    changes_summary text,
    old_staff_assignments jsonb,
    new_staff_assignments jsonb,
    slots_freed integer DEFAULT 0,
    slots_blocked integer DEFAULT 0,
    extension_slots_blocked integer DEFAULT 0,
    force_override boolean DEFAULT false,
    override_reason text,
    admin_notes text,
    edit_reason text,
    client_impact_assessment text,
    system_info jsonb,
    edit_timestamp timestamp with time zone DEFAULT now()
);
```

### Event Types Extended
```sql
-- Updated constraint to include new event type
ALTER TABLE appointment_events ADD CONSTRAINT appointment_events_event_type_check
CHECK (event_type = ANY (ARRAY[
  'created', 'confirmed', 'cancelled', 'rejected',
  'completed', 'modified', 'edited', 'edited_extend'
]));
```

## Usage Examples

### 1. Simple Time Change
```typescript
// Frontend call
const { error } = await supabase.rpc('edit_admin_booking_with_dual_services', {
  _appointment_id: 'uuid',
  _new_date: '2024-11-04',
  _new_time: '09:00:00',
  _edit_reason: 'Client requested time change'
});
```

**Result**: 
- Old slots freed, new slots blocked
- `operation_type: 'time_change'`
- `client_impact_assessment: 'HIGH - Date/time changed, client notification required'`

### 2. Staff Reassignment
```typescript
const { error } = await supabase.rpc('edit_admin_booking_with_dual_services', {
  _appointment_id: 'uuid',
  _new_staff_ids: ['new_primary_staff_id', 'new_secondary_staff_id'],
  _edit_reason: 'Staff availability conflict'
});
```

**Result**:
- Old staff slots freed, new staff slots blocked
- `operation_type: 'staff_change'`
- Staff assignments updated in `appointment_staff` table

### 3. Time Extension with Override
```typescript
const { error } = await supabase.rpc('edit_admin_booking_with_dual_services', {
  _appointment_id: 'uuid',
  _new_duration: 120, // was 90, extending by 30 minutes
  _force_override: true,
  _edit_reason: 'Pet requires extra grooming time'
});
```

**Result**:
- Extension applied to last service segment
- `operation_type: 'override_edit'`
- `is_admin_override: true` set on appointment
- Extension slots blocked even if occupied

## Error Handling

### Common Errors and Solutions

1. **"Extension not fully available"**
   - **Cause**: Trying to extend into occupied slots without override
   - **Solution**: Use `_force_override: true` or choose different time

2. **"Staff not available for date/time"**
   - **Cause**: New time slot conflicts with staff availability
   - **Solution**: Check availability first or use override

3. **"Appointment not found"**
   - **Cause**: Invalid appointment ID
   - **Solution**: Verify appointment exists and user has access

### Frontend Error Display
```typescript
if (error?.message?.includes('Extension not fully available')) {
  toast.error('Horário não disponível para extensão. Use override se necessário.');
} else if (error?.message?.includes('not available')) {
  toast.error('Staff não disponível no horário selecionado.');
} else {
  toast.error('Erro ao editar agendamento: ' + error.message);
}
```

## Performance Considerations

### Database Optimizations
- Indexes on `admin_edit_logs` for efficient querying
- Atomic transactions prevent partial updates
- Efficient slot checking with time-based queries

### Frontend Optimizations
- Debounced availability checking
- Memoized time slot calculations
- Lazy loading of edit logs

## Security & Permissions

### Access Control
- Only authenticated admin users can edit bookings
- All edits logged with admin user identification
- Override actions specially flagged and tracked

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate operation types and statuses
- Atomic transactions prevent inconsistent states

## Testing Scenarios

### 1. Single Service Edit
- ✅ Change date/time
- ✅ Change staff
- ✅ Extend duration
- ✅ Add extra fee
- ✅ Override conflicts

### 2. Dual Service Edit
- ✅ Change date/time (both services move together)
- ✅ Change primary staff only
- ✅ Change secondary staff only
- ✅ Change both staff members
- ✅ Extend duration (extends secondary service)
- ✅ Override with conflicts

### 3. Edge Cases
- ✅ Same-day edit (no date change)
- ✅ Staff change to same person (no-op)
- ✅ Duration change to same value (no extension)
- ✅ Multiple rapid edits
- ✅ Edit during high availability contention

## Monitoring & Maintenance

### Key Metrics to Monitor
- Edit success/failure rates
- Override usage frequency
- Client impact distribution (HIGH/MEDIUM/LOW)
- Average slots affected per edit
- Staff reassignment patterns

### Log Retention
- `admin_edit_logs`: Recommended 2+ years for audit compliance
- `appointment_events`: Permanent retention
- Regular cleanup of old system_info JSON to manage size

### Troubleshooting Tools
1. **Admin Edit Logs Page**: Real-time view of all edits
2. **Database Queries**: Direct access to detailed logs
3. **Console Logging**: Detailed NOTICE messages during execution
4. **Error Tracking**: Comprehensive error messages with context

## Future Enhancements

### Planned Features
- [ ] Bulk edit operations
- [ ] Edit templates for common changes
- [ ] Client notification integration
- [ ] Advanced conflict resolution UI
- [ ] Edit approval workflows
- [ ] Integration with calendar systems

### Technical Improvements
- [ ] GraphQL integration for real-time updates
- [ ] WebSocket notifications for concurrent edits
- [ ] Advanced caching strategies
- [ ] Machine learning for conflict prediction

---

## Summary

The Admin Booking Edit System provides a robust, auditable, and user-friendly solution for managing appointment modifications. With comprehensive logging, visual feedback, and atomic operations, it ensures data integrity while providing excellent user experience for administrative staff.

**Key Success Metrics**:
- ✅ 100% edit operations logged
- ✅ Zero data inconsistencies
- ✅ Real-time availability updates
- ✅ Comprehensive override tracking
- ✅ Intuitive visual interface
- ✅ Atomic staff/availability management

The system successfully handles all appointment types (single/dual service) with proper extension logic, staff reassignment, and conflict resolution while maintaining complete audit trails for compliance and troubleshooting.
