-- Add Client Profile 2.0 columns to public.clients
-- Migration: 20250127000000_add_client_profile_columns.sql
-- Description: Adds new columns for client profile management (contact, preferences, emergency, marketing, progress)

-- CONTACT & PREFERENCES
alter table public.clients add column if not exists is_whatsapp                boolean;
-- 'telefone' | 'email' | 'none' (temporary text; we'll normalize later)
alter table public.clients add column if not exists preferred_channel          text;

-- EMERGENCY & PREFERENCE HINTS
alter table public.clients add column if not exists emergency_contact_name     text;
alter table public.clients add column if not exists emergency_contact_phone    text;
alter table public.clients add column if not exists preferred_staff_profile_id uuid references public.staff_profiles(id);
alter table public.clients add column if not exists accessibility_notes        text;
alter table public.clients add column if not exists general_notes              text;

-- MARKETING (stored as codes in text for now)
-- valid examples: 'indicacao_amigo','cliente_frequente','facebook_ig','google','trafego_local','outro'
alter table public.clients add column if not exists marketing_source_code      text;
alter table public.clients add column if not exists marketing_source_other     text;

-- PROGRESS & UX (cached; computed later by RPC/function)
alter table public.clients add column if not exists profile_completion_score   int;
alter table public.clients add column if not exists first_visit_setup_at       timestamptz;
alter table public.clients add column if not exists last_nudge_dismissed_at    timestamptz;

-- Helpful comment hints (no constraints so we don't block admins)
comment on column public.clients.preferred_channel     is 'telefone|email|none';
comment on column public.clients.marketing_source_code is 'indicacao_amigo|cliente_frequente|facebook_ig|google|trafego_local|outro';

-- Index for the preference hint (cheap)
create index if not exists idx_clients_preferred_staff_profile_id
  on public.clients (preferred_staff_profile_id);
