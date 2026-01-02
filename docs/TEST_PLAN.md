# Client Profile 2.0 - Comprehensive Test Plan

## Overview

This document outlines comprehensive testing scenarios for the Client Profile 2.0 system, covering all new features including database changes, RPCs, frontend components, micro-wizard, smart nudges, and consent management.

## Prerequisites

- ✅ Database migration `20250824130000_client_profile_2_0_schema.sql` applied
- ✅ Lookup tables seeded with default data
- ✅ RLS policies active and verified
- ✅ RPCs deployed and accessible
- ✅ Frontend components built and deployed

---

## 1. Database & Migration Testing

### 1.1 Schema Validation

**Test Case DB-01: Verify all new columns exist**
- **Steps:**
  1. Connect to database
  2. Query `clients` table schema
  3. Verify presence of all new Client Profile 2.0 fields
- **Expected Results:**
  - All new fields present: `is_whatsapp`, `preferred_channel_id`, `emergency_contact_name`, `emergency_contact_phone`, `preferred_staff_profile_id`, `accessibility_notes`, `general_notes`, `marketing_source_id`, `marketing_source_other`, `profile_completion_score`, `first_visit_setup_at`, `last_nudge_dismissed_at`
  - All consent cache fields: `consent_tos`, `consent_privacy`, `consent_reminders`, `consent_marketing_email`, `consent_marketing_sms`, `consent_marketing_whatsapp`
  - Fields are nullable with correct data types

**Test Case DB-02: Lookup tables populated**
- **Steps:**
  1. Query `contact_channels` table
  2. Query `marketing_sources` table
  3. Verify default seed data
- **Expected Results:**
  - `contact_channels`: whatsapp, sms, email, phone_call entries present
  - `marketing_sources`: referral, instagram, facebook, google, local_traffic, word_of_mouth, other entries present
  - All entries have active=true and correct display_order

**Test Case DB-03: Client consents table structure**
- **Steps:**
  1. Verify `client_consents` table exists
  2. Test constraint on `type` field
  3. Verify foreign key to clients table
- **Expected Results:**
  - Table exists with correct columns
  - CHECK constraint allows only valid consent types
  - Foreign key constraint properly references `clients.user_id`

### 1.2 RLS Policy Testing

**Test Case RLS-01: Client profile access**
- **Steps:**
  1. Log in as client user
  2. Attempt to read own profile
  3. Attempt to read another client's profile
  4. Attempt to update own profile
  5. Attempt to update another client's profile
- **Expected Results:**
  - ✅ Can read own profile
  - ❌ Cannot read other clients' profiles
  - ✅ Can update own profile
  - ❌ Cannot update other clients' profiles

**Test Case RLS-02: Admin access**
- **Steps:**
  1. Log in as admin user
  2. Attempt to read any client profile
  3. Attempt to read all consents
  4. Attempt to manage lookup tables
- **Expected Results:**
  - ✅ Can read all client profiles
  - ✅ Can read all consents
  - ✅ Can manage lookup tables

**Test Case RLS-03: Staff access**
- **Steps:**
  1. Log in as staff user
  2. Attempt to read client profiles
  3. Verify staff can view clients for appointment context
- **Expected Results:**
  - ✅ Can read client profiles (for appointment context)
  - ❌ Cannot update client profiles

---

## 2. RPC Function Testing

### 2.1 Profile Update RPC

**Test Case RPC-01: client_update_profile - Basic functionality**
- **Steps:**
  1. Call RPC with phone update: `SELECT client_update_profile(p_phone => '11999999999')`
  2. Verify profile updated
  3. Verify completion score recalculated
- **Expected Results:**
  - Profile updated successfully
  - `profile_completion_score` increased
  - `updated_at` timestamp updated

**Test Case RPC-02: client_update_profile - All parameters**
- **Steps:**
  1. Call RPC with all parameters populated
  2. Verify all fields updated correctly
  3. Check lookup resolution (channel codes → IDs)
- **Expected Results:**
  - All provided fields updated
  - Lookup codes properly resolved to UUIDs
  - Completion score at maximum

**Test Case RPC-03: client_update_profile - Error handling**
- **Steps:**
  1. Call RPC with invalid channel code
  2. Call RPC with invalid marketing source code
  3. Call RPC without authentication
- **Expected Results:**
  - ❌ Invalid channel code raises exception
  - ❌ Invalid marketing source code raises exception
  - ❌ Unauthenticated call raises exception

### 2.2 Progress Tracking RPC

**Test Case RPC-04: client_get_profile_progress**
- **Steps:**
  1. Create client with minimal data
  2. Call progress RPC
  3. Update profile with more data
  4. Call progress RPC again
- **Expected Results:**
  - Initial call returns low percentage + missing fields array
  - Second call returns higher percentage + fewer missing fields

### 2.3 Consent Logging RPC

**Test Case RPC-05: client_log_consent - Basic functionality**
- **Steps:**
  1. Call RPC: `SELECT client_log_consent('tos', true, '1.0')`
  2. Verify consent record created
  3. Verify cached consent updated on profile
- **Expected Results:**
  - Append-only record in `client_consents`
  - `consent_tos` field updated to true on client profile
  - Trigger properly synced cache

**Test Case RPC-06: client_log_consent - Channel-specific consents**
- **Steps:**
  1. Log reminder consent with channel: `SELECT client_log_consent('reminders', true, '1.0', 'whatsapp')`
  2. Verify channel_code stored correctly
- **Expected Results:**
  - Consent record includes channel_code
  - Cached consent updated appropriately

---

## 3. Frontend Component Testing

### 3.1 Micro-Wizard Component

**Test Case MW-01: First visit detection**
- **Steps:**
  1. Register new user
  2. Complete email confirmation
  3. Visit Profile page
  4. Verify micro-wizard appears after 1s delay
- **Expected Results:**
  - Wizard modal opens automatically
  - "Configuração Inicial" title displayed
  - Step 1 (Contato) is active

**Test Case MW-02: Step progression**
- **Steps:**
  1. Complete Step 1 (Contact info)
  2. Click "Continuar"
  3. Verify Step 2 (Reminders) appears
  4. Accept ToS/Privacy
  5. Continue to Step 3 (Emergency)
  6. Continue to Step 4 (Preferences)
  7. Click "Finalizar"
- **Expected Results:**
  - Each step saves data incrementally
  - Progress bar updates correctly
  - Step indicators show completion
  - Final step marks `first_visit_setup_at`

**Test Case MW-03: Skip functionality**
- **Steps:**
  1. Open wizard
  2. Click "Pular" on each step
  3. Verify data is saved for completed fields only
- **Expected Results:**
  - Partial data saved at each skip
  - Wizard completes successfully
  - Setup marked as completed

**Test Case MW-04: Validation & Error handling**
- **Steps:**
  1. Attempt to proceed without accepting ToS/Privacy on Step 2
  2. Test form validation on each step
  3. Test network error handling
- **Expected Results:**
  - Cannot proceed without required consents
  - Form validation messages appear
  - Network errors handled gracefully

### 3.2 Updated Profile Page

**Test Case PROF-01: Progress meter display**
- **Steps:**
  1. Visit Profile page with partial profile
  2. Verify progress meter shows correct percentage
  3. Complete more fields
  4. Verify progress updates
- **Expected Results:**
  - Progress meter displays accurate completion percentage
  - Missing fields listed appropriately
  - Visual indicators (colors, badges) reflect completion level

**Test Case PROF-02: Left card (read-only)**
- **Steps:**
  1. Verify email display (non-editable)
  2. Verify account type badge
  3. Verify registration date
  4. Verify consent status indicators
- **Expected Results:**
  - All fields display correctly
  - No edit controls on left card
  - Consent status shows green/red indicators

**Test Case PROF-03: Right card sections**
- **Steps:**
  1. Click "Editar Perfil"
  2. Verify all new sections appear:
     - Contact & Preferences
     - Emergency Contact
     - Preferences (staff, marketing, accessibility)
  3. Test each field type (input, select, textarea, checkbox)
  4. Save changes
- **Expected Results:**
  - All sections render correctly
  - Form controls work as expected
  - Save operation uses new RPC
  - Success feedback provided

**Test Case PROF-04: Lookup integration**
- **Steps:**
  1. Open contact channel dropdown
  2. Open marketing source dropdown
  3. Open preferred staff dropdown
  4. Verify data loads from lookup tables
- **Expected Results:**
  - Dropdowns populated with correct data
  - Options display properly formatted
  - Selection saves correctly

### 3.3 Smart Nudges System

**Test Case SN-01: Banner visibility logic**
- **Steps:**
  1. Create profile with <80% completion
  2. Visit Profile page
  3. Verify banner appears
  4. Complete profile to >80%
  5. Refresh page
- **Expected Results:**
  - Banner visible when completion <80%
  - Banner hidden when completion ≥80%
  - Appropriate messaging and styling

**Test Case SN-02: Dismiss functionality**
- **Steps:**
  1. Display nudge banner
  2. Click "Lembrar depois"
  3. Refresh page immediately
  4. Wait 25 hours and refresh
- **Expected Results:**
  - Banner disappears after dismiss
  - Stays hidden for 24 hours
  - Reappears after 24 hours if still <80%

**Test Case SN-03: Booking flow nudges**
- **Steps:**
  1. Start booking flow with incomplete profile (missing phone)
  2. Verify inline nudge appears
  3. Fill phone in nudge
  4. Click "Salvar e Continuar"
  5. Verify phone saved and booking continues
- **Expected Results:**
  - Booking nudge appears for critical missing fields
  - Quick-fix functionality works
  - Booking flow continues smoothly

---

## 4. Integration Testing

### 4.1 End-to-End User Flows

**Test Case E2E-01: New user complete journey**
- **Steps:**
  1. Register new user via email
  2. Confirm email
  3. First Profile page visit triggers wizard
  4. Complete wizard (save all data)
  5. Verify profile completion and data persistence
- **Expected Results:**
  - Seamless flow from registration to completed profile
  - All data saved correctly across database
  - Progress reflects actual completion

**Test Case E2E-02: Returning user profile updates**
- **Steps:**
  1. Log in as existing user
  2. View current profile and progress
  3. Edit profile through standard form
  4. Verify updates saved and progress recalculated
- **Expected Results:**
  - Existing data preserved
  - New data saved correctly
  - Progress meter updates in real-time

**Test Case E2E-03: Consent management flow**
- **Steps:**
  1. Grant consents via wizard
  2. View consent status on Profile
  3. Grant additional consents via future flows
  4. Verify append-only log and cached status
- **Expected Results:**
  - All consent actions logged
  - Cache accurately reflects latest state
  - Audit trail preserved

### 4.2 Cross-Component Integration

**Test Case INT-01: Wizard → Profile data consistency**
- **Steps:**
  1. Complete wizard with specific values
  2. Navigate to Profile page
  3. Verify all wizard data appears correctly
  4. Edit through Profile interface
  5. Verify data consistency maintained
- **Expected Results:**
  - Perfect data consistency across components
  - No data loss or corruption
  - Format preservation

**Test Case INT-02: Smart nudges → Action integration**
- **Steps:**
  1. Display nudge banner
  2. Click "Completar Agora"
  3. Verify Profile enters edit mode
  4. Complete missing fields
  5. Verify nudge disappears appropriately
- **Expected Results:**
  - Nudge actions work correctly
  - Profile responds to nudge interactions
  - UI state management proper

---

## 5. Performance & Accessibility Testing

### 5.1 Performance Testing

**Test Case PERF-01: Page load performance**
- **Steps:**
  1. Measure Profile page load time with new features
  2. Test with various profile completion levels
  3. Monitor network requests and database queries
- **Expected Results:**
  - Page loads within 2 seconds
  - Database queries optimized
  - No unnecessary network calls

**Test Case PERF-02: RPC performance**
- **Steps:**
  1. Measure RPC execution time under load
  2. Test concurrent RPC calls
  3. Monitor database performance during profile updates
- **Expected Results:**
  - RPCs execute within 500ms
  - Handle concurrent access gracefully
  - No database deadlocks or conflicts

### 5.2 Accessibility Testing

**Test Case A11Y-01: Keyboard navigation**
- **Steps:**
  1. Navigate entire Profile page using only keyboard
  2. Test micro-wizard keyboard navigation
  3. Test smart nudges keyboard accessibility
- **Expected Results:**
  - All interactive elements keyboard accessible
  - Proper tab order maintained
  - Focus indicators visible

**Test Case A11Y-02: Screen reader compatibility**
- **Steps:**
  1. Test Profile page with screen reader
  2. Verify form labels and ARIA attributes
  3. Test wizard step announcements
- **Expected Results:**
  - All content readable by screen reader
  - Form fields properly labeled
  - Progress and status announcements clear

---

## 6. Error Handling & Edge Cases

### 6.1 Network & Database Errors

**Test Case ERR-01: Database unavailable**
- **Steps:**
  1. Simulate database connection failure
  2. Attempt Profile page operations
  3. Verify graceful error handling
- **Expected Results:**
  - User-friendly error messages
  - No application crashes
  - Retry mechanisms where appropriate

**Test Case ERR-02: RPC failures**
- **Steps:**
  1. Simulate RPC timeout
  2. Simulate RPC permission error
  3. Test partial update failures
- **Expected Results:**
  - Clear error feedback to user
  - No partial data corruption
  - Rollback mechanisms working

### 6.2 Data Validation Edge Cases

**Test Case EDGE-01: Extreme data values**
- **Steps:**
  1. Test very long strings in text fields
  2. Test special characters in all inputs
  3. Test empty/null value handling
- **Expected Results:**
  - Proper validation and sanitization
  - Database constraints honored
  - No XSS vulnerabilities

**Test Case EDGE-02: Concurrent modifications**
- **Steps:**
  1. Open Profile in two browser tabs
  2. Edit different fields simultaneously
  3. Save in different order
- **Expected Results:**
  - Last-write-wins or proper conflict resolution
  - No data loss
  - User feedback on conflicts

---

## 7. Security Testing

### 7.1 Authentication & Authorization

**Test Case SEC-01: Unauthorized access**
- **Steps:**
  1. Attempt to access RPCs without authentication
  2. Attempt to access other users' data
  3. Test RLS policy enforcement
- **Expected Results:**
  - All unauthorized attempts blocked
  - Proper error messages (not revealing internal structure)
  - Audit logs generated

**Test Case SEC-02: Data privacy**
- **Steps:**
  1. Verify consent data properly protected
  2. Test profile data access restrictions
  3. Verify no sensitive data in logs
- **Expected Results:**
  - LGPD compliance maintained
  - No sensitive data leakage
  - Proper consent audit trail

### 7.2 Input Sanitization

**Test Case SEC-03: SQL injection prevention**
- **Steps:**
  1. Attempt SQL injection through all form inputs
  2. Test parameterized queries in RPCs
  3. Verify input sanitization
- **Expected Results:**
  - No SQL injection possible
  - All inputs properly parameterized
  - Dangerous characters escaped

---

## 8. Compatibility Testing

### 8.1 Browser Compatibility

**Test Case COMP-01: Cross-browser testing**
- **Steps:**
  1. Test in Chrome, Firefox, Safari, Edge
  2. Verify all features work consistently
  3. Test mobile browsers
- **Expected Results:**
  - Consistent functionality across browsers
  - UI renders correctly
  - No JavaScript errors

### 8.2 Device Compatibility

**Test Case COMP-02: Responsive design**
- **Steps:**
  1. Test Profile page on mobile devices
  2. Test micro-wizard on small screens
  3. Verify touch interactions
- **Expected Results:**
  - All components responsive
  - Touch targets appropriately sized
  - Scrolling and navigation smooth

---

## 9. Migration & Rollback Testing

### 9.1 Migration Testing

**Test Case MIG-01: Fresh installation**
- **Steps:**
  1. Apply migration on clean database
  2. Verify all objects created correctly
  3. Test with fresh user registration
- **Expected Results:**
  - Migration runs without errors
  - All tables, functions, policies created
  - New users work immediately

**Test Case MIG-02: Existing data preservation**
- **Steps:**
  1. Create users with old schema
  2. Apply migration
  3. Verify existing users still work
  4. Test old and new features together
- **Expected Results:**
  - No existing data lost
  - Backward compatibility maintained
  - New features work with existing users

### 9.2 Rollback Planning

**Test Case ROLL-01: Migration rollback**
- **Steps:**
  1. Document rollback procedures
  2. Test rollback script (if needed)
  3. Verify system stability after rollback
- **Expected Results:**
  - Clear rollback documentation
  - System functional after rollback
  - No data corruption

---

## 10. Acceptance Criteria Verification

### 10.1 Requirements Compliance

**Final Check: Deliverables vs Requirements**

✅ **Database Changes:**
- All new profile fields added
- Lookup tables created and seeded
- LGPD-compliant consent tracking
- Profile completion calculation

✅ **Backend RPCs:**
- client_update_profile with all parameters
- client_get_profile_progress functionality
- client_log_consent with cache sync

✅ **Frontend Components:**
- 4-step micro-wizard (skippable)
- Updated Profile page (left/right cards)
- Smart nudges system
- Progress meter display

✅ **UX Requirements:**
- Email-based auth preserved
- Minimal signup friction
- Progressive data collection
- Non-intrusive nudges
- 60-90 second setup time

✅ **Technical Requirements:**
- RLS policies enforced
- America/Sao_Paulo timezone
- Table-driven constraints
- Server-side secrets
- No CPF/CNPJ fields

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Migration applied to test environment
- [ ] Test users created (client, staff, admin)
- [ ] Lookup tables populated
- [ ] RLS policies verified active

### Database Testing
- [ ] All schema tests passed
- [ ] RLS policy tests passed
- [ ] RPC function tests passed

### Frontend Testing
- [ ] Micro-wizard tests passed
- [ ] Profile page tests passed
- [ ] Smart nudges tests passed

### Integration Testing
- [ ] End-to-end flows passed
- [ ] Cross-component integration passed

### Quality Assurance
- [ ] Performance tests passed
- [ ] Accessibility tests passed
- [ ] Security tests passed
- [ ] Browser compatibility verified

### Final Verification
- [ ] All acceptance criteria met
- [ ] No critical bugs outstanding
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Reporting

### Test Results Summary
- **Total Test Cases:** 60+
- **Critical Path Tests:** 15
- **Performance Benchmarks:** 5
- **Security Validations:** 8
- **Accessibility Checks:** 4

### Success Criteria
- ✅ 100% of critical path tests pass
- ✅ No high-severity security issues
- ✅ Performance meets requirements
- ✅ Accessibility standards met
- ✅ All browsers supported

### Risk Mitigation
- Database rollback plan documented
- Feature flags for gradual rollout
- Monitoring alerts configured
- User feedback collection ready

---

*This test plan ensures comprehensive validation of the Client Profile 2.0 system before production deployment.*
