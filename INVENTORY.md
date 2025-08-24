# Client Profile 2.0 - Inventory & Analysis

## Current Database Schema

### Primary Tables
**clients** (canonical client profile entity)
- Current columns:
  - `user_id` UUID (PK) - references auth.users.id
  - `name` TEXT
  - `email` TEXT  
  - `phone` TEXT
  - `address` TEXT
  - `notes` TEXT  
  - `birth_date` DATE
  - `admin_created` BOOLEAN - from recent admin booking changes
  - `claimed_at` TIMESTAMPTZ - from recent claim system  
  - `claim_invited_at` TIMESTAMPTZ - from recent claim system

### Existing Lookup Tables
- **clinics** - exists (id, name, address, phone, email, active, created_at)
- **locations** - exists (referenced in staff_profiles)  
- **breeds** - exists (id, name, size_category, active, created_at, updated_at)
- **staff_profiles** - exists (id, user_id, name, email, location_id, can_groom, can_vet, can_bathe, active)

### Missing Lookup Tables (need to create)
- **contact_channels** - for preferred communication method
- **marketing_sources** - for "Como nos conheceu?" attribution  

### Missing Core Tables (need to create) 
- **client_consents** - LGPD-friendly append-only consent log
- Profile completion functionality tables (or computed fields)

## Current RLS Policies

### clients table
- "Client can view own client record" - SELECT using user_id = auth.uid()
- "Admin can view all client records" - SELECT using admin role check
- Missing: UPDATE policies for client self-updates
- Missing: INSERT policies
- Missing: Staff/admin read policies

### Other relevant policies
- user_roles: Users can view their own roles, admins can view/manage all
- breeds: Anyone can view active breeds, admins can manage
- Need to assess: clinics table RLS policies

## Current RPCs/Functions

### User Management
- `handle_new_user()` - trigger function that creates client profiles on auth.users INSERT
- `has_role(_user_id UUID, _role TEXT)` - SECURITY DEFINER role checking function

### Admin Booking (from LOG)  
- `create_booking_admin` - admin booking with _client_id/_client_user_id support
- `create_booking_admin_override` - admin override booking
- `create_admin_booking_with_dual_services` - dual service admin booking

### Missing RPCs (need to create)
- `client_update_profile(...)` - RLS-friendly profile updates
- `client_get_profile_progress()` - completion percentage calculation  
- `client_log_consent(...)` - consent logging

## Frontend Components

### Existing UI Files
**Profile Page**: `src/pages/Profile.tsx`
- Current structure: left card (read-only) + right card (editable)
- Left card: email, account type, registration date ✓
- Right card: name, phone, birth_date, address, notes ✓
- Uses direct supabase client updates
- Missing: progress meter, consent management, completion tracking

**Registration**: `src/pages/Register.tsx` 
- Standard email-based registration
- Missing: post-confirmation micro-wizard trigger

**Other relevant pages**:
- `src/pages/AdminClients.tsx` - admin client management
- `src/pages/AdminSettings.tsx` - admin settings

### Missing UI Components (need to create)
- Micro-wizard component (4 steps: Contato, Lembretes, Emergência, Preferências)
- Smart nudges system  
- Consent management UI
- Profile progress meter
- Lookup dropdowns (contact channels, marketing sources, clinics)

## TypeScript Types

### Current
- Uses `Tables<'clients'>` from supabase types
- Basic client data type exists

### Missing
- Extended client profile type with new fields
- Lookup table types (contact_channels, marketing_sources) 
- Consent types
- Progress tracking types

## Database Dependencies

### Locations/Clinics  
- **clinics** table exists and ready for "unidade preferida" 
- Structure: id, name, address, phone, email, active, created_at

### Staff References
- **staff_profiles** table exists for preferred staff selection
- Structure includes: id, user_id, name, email, location_id, can_groom, can_vet, can_bathe, active

## Scope Assessment

### In Scope (this PR)
- Add new fields to clients table (contact, emergency, marketing, progress, consent flags)
- Create lookup tables (contact_channels, marketing_sources)  
- Create client_consents append-only table
- Create 3 new RPCs for profile management
- Build micro-wizard component
- Update Profile page with new sections  
- Add smart nudges system
- Update TypeScript types

### Out of Scope (future work)
- Authorized pickups (flagged for later)
- Notification preferences beyond reminders  
- Multi-location full implementation
- Advanced consent management UI
- Admin booking modifications (per SILO scope)

## Files We Will Touch

### Database
- New migration: `add_client_profile_2_0_schema.sql`

### Backend  
- New RPCs in migration

### Frontend
- `src/pages/Profile.tsx` - major updates
- New: `src/components/ClientMicroWizard.tsx`
- New: `src/components/SmartNudges.tsx`  
- `src/integrations/supabase/types.ts` - extend types
- Various lookup components

### Documentation
- This INVENTORY.md
- New TEST_PLAN.md

## Risk Assessment

### Low Risk
- Adding nullable columns to clients table
- Creating new lookup tables
- New RPC functions with SECURITY INVOKER

### Medium Risk  
- Profile page UI changes (existing users)
- RLS policy updates
- Micro-wizard integration point

### Mitigation
- All new fields nullable with defaults
- Maintain existing Profile page functionality  
- Thorough testing of RLS policies
- Gradual rollout of micro-wizard (skippable)

## Dependencies & Assumptions

### Existing Dependencies
- Current auth flow (email confirmation)
- Existing client registration trigger  
- Current admin/client role separation [[memory:7103217]]
- America/Sao_Paulo timezone [[memory:7103228]]

### Assumptions  
- No CPF/CNPJ required (confirmed in scope)
- Email-based auth remains primary
- Existing admin booking logic unchanged [[memory:7103215]]
- Server-side secrets stay server-side [[memory:7103227]]

## Success Criteria

### Database
- [ ] All new tables created with proper RLS
- [ ] All new columns added safely  
- [ ] New RPCs working correctly
- [ ] Profile completion calculation functional

### Frontend  
- [ ] Profile page maintains existing UX
- [ ] Micro-wizard triggers correctly  
- [ ] Smart nudges display appropriately
- [ ] All new fields editable/readable
- [ ] Progress meter displays correctly

### Integration
- [ ] Registration flow → micro-wizard handoff
- [ ] Consent logging functional
- [ ] Lookup tables populated and accessible
- [ ] No regressions in existing client/admin flows
