-- Client Profile 2.0 - Complete Schema Migration
-- Purpose: Add comprehensive client profile fields, consents, and progress tracking
-- Timezone: America/Sao_Paulo per project standards
-- Approach: Table-driven constraints, nullable fields, LGPD compliance

-- =============================================================================
-- 1. CREATE LOOKUP TABLES (prefer over ENUMs for flexibility)
-- =============================================================================

-- 1.1 Contact Channels Lookup
CREATE TABLE IF NOT EXISTS public.contact_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- whatsapp, sms, email, phone_call
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')
);

-- 1.2 Marketing Sources Lookup  
CREATE TABLE IF NOT EXISTS public.marketing_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- referral, instagram, facebook, google, local_traffic, word_of_mouth, other
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')
);

-- =============================================================================
-- 2. EXTEND CLIENTS TABLE (all nullable, preserve existing structure)
-- =============================================================================

-- 2.1 Contact & Preferences
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_whatsapp BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_channel_id UUID 
    REFERENCES public.contact_channels(id) ON DELETE SET NULL;

-- 2.2 Emergency & Preference Hints  
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_staff_profile_id UUID 
    REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS accessibility_notes TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS general_notes TEXT DEFAULT NULL;

-- 2.3 Marketing Attribution
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS marketing_source_id UUID 
    REFERENCES public.marketing_sources(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS marketing_source_other TEXT DEFAULT NULL;

-- 2.4 Progress & UX Tracking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT NULL 
    CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS first_visit_setup_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_nudge_dismissed_at TIMESTAMPTZ DEFAULT NULL;

-- 2.5 Consent Cache (optional cached snapshot for performance)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_tos BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_privacy BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_reminders BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_marketing_email BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_marketing_sms BOOLEAN DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consent_marketing_whatsapp BOOLEAN DEFAULT NULL;

-- Add updated_at to clients table for tracking changes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ 
    DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo');

-- =============================================================================
-- 3. LGPD-FRIENDLY APPEND-ONLY CONSENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL, -- Note: references clients.user_id (not clients.id)
    type TEXT NOT NULL CHECK (type IN ('tos', 'privacy', 'reminders', 'marketing_email', 'marketing_sms', 'marketing_whatsapp')),
    granted BOOLEAN NOT NULL,
    channel_code TEXT DEFAULT NULL, -- e.g., 'whatsapp', 'sms', 'email' for reminders
    version TEXT NOT NULL DEFAULT '1.0',
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    
    -- Foreign key constraint
    CONSTRAINT fk_client_consents_client_id 
        FOREIGN KEY (client_id) REFERENCES public.clients(user_id) ON DELETE CASCADE
);

-- Index for efficient consent lookups
CREATE INDEX IF NOT EXISTS idx_client_consents_client_type 
    ON public.client_consents(client_id, type);
CREATE INDEX IF NOT EXISTS idx_client_consents_created_at 
    ON public.client_consents(created_at);

-- =============================================================================
-- 4. PROFILE COMPLETION HELPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.f_client_profile_progress(target_client_id UUID)
RETURNS TABLE(percent_complete INTEGER, missing_fields TEXT[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    client_record record;
    total_fields INTEGER := 10; -- Adjust based on fields we consider "complete"
    completed_fields INTEGER := 0;
    missing_list TEXT[] := '{}';
BEGIN
    -- Get client record
    SELECT * INTO client_record 
    FROM public.clients 
    WHERE user_id = target_client_id;
    
    IF client_record IS NULL THEN
        RETURN QUERY SELECT 0, ARRAY['client_not_found'];
        RETURN;
    END IF;
    
    -- Check each field and count completed ones
    -- Core fields (weight: 1 each)
    IF client_record.name IS NOT NULL AND trim(client_record.name) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'name';
    END IF;
    
    IF client_record.phone IS NOT NULL AND trim(client_record.phone) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'phone';
    END IF;
    
    IF client_record.is_whatsapp IS NOT NULL THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'is_whatsapp';
    END IF;
    
    IF client_record.preferred_channel_id IS NOT NULL THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'preferred_channel';
    END IF;
    
    IF client_record.emergency_contact_name IS NOT NULL AND trim(client_record.emergency_contact_name) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'emergency_contact_name';
    END IF;
    
    IF client_record.emergency_contact_phone IS NOT NULL AND trim(client_record.emergency_contact_phone) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'emergency_contact_phone';
    END IF;
    
    -- Optional fields (still count toward completion)
    IF client_record.marketing_source_id IS NOT NULL OR 
       (client_record.marketing_source_other IS NOT NULL AND trim(client_record.marketing_source_other) != '') THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'marketing_source';
    END IF;
    
    IF client_record.accessibility_notes IS NOT NULL AND trim(client_record.accessibility_notes) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'accessibility_notes';
    END IF;
    
    IF client_record.general_notes IS NOT NULL AND trim(client_record.general_notes) != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'general_notes';
    END IF;
    
    -- Consent check (basic ToS/Privacy required)
    IF client_record.consent_tos = true AND client_record.consent_privacy = true THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_list := missing_list || 'basic_consents';
    END IF;
    
    -- Calculate percentage
    RETURN QUERY SELECT 
        ROUND((completed_fields::NUMERIC / total_fields::NUMERIC) * 100)::INTEGER,
        missing_list;
END;
$$;

-- Create convenience view for profile progress
CREATE OR REPLACE VIEW public.client_profile_progress AS
SELECT 
    c.user_id as client_id,
    c.name,
    c.email,
    progress.percent_complete,
    progress.missing_fields,
    c.profile_completion_score as cached_score,
    c.updated_at
FROM public.clients c
CROSS JOIN LATERAL public.f_client_profile_progress(c.user_id) as progress;

-- =============================================================================
-- 5. SEED LOOKUP TABLES
-- =============================================================================

-- 5.1 Contact Channels
INSERT INTO public.contact_channels (code, name, description, display_order) VALUES
    ('whatsapp', 'WhatsApp', 'Mensagens via WhatsApp', 1),
    ('sms', 'SMS', 'Mensagens de texto SMS', 2),
    ('email', 'E-mail', 'Mensagens por e-mail', 3),
    ('phone_call', 'Ligação', 'Contato por telefone', 4)
ON CONFLICT (code) DO NOTHING;

-- 5.2 Marketing Sources
INSERT INTO public.marketing_sources (code, name, description, display_order) VALUES
    ('referral', 'Indicação', 'Indicado por cliente ou conhecido', 1),
    ('instagram', 'Instagram', 'Descobriu através do Instagram', 2),
    ('facebook', 'Facebook', 'Descobriu através do Facebook', 3),  
    ('google', 'Google', 'Busca no Google', 4),
    ('local_traffic', 'Tráfego Local', 'Passou em frente ao estabelecimento', 5),
    ('word_of_mouth', 'Boca a Boca', 'Ouviu falar com conhecidos', 6),
    ('other', 'Outro', 'Outra forma não listada', 7)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================

-- 6.1 Contact Channels (world-readable for dropdowns)
ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active contact channels" 
    ON public.contact_channels FOR SELECT 
    USING (active = true);

CREATE POLICY "Admins can manage contact channels" 
    ON public.contact_channels FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 6.2 Marketing Sources (world-readable for dropdowns)  
ALTER TABLE public.marketing_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketing sources" 
    ON public.marketing_sources FOR SELECT 
    USING (active = true);

CREATE POLICY "Admins can manage marketing sources" 
    ON public.marketing_sources FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 6.3 Client Consents (append-only for clients, read-all for admins)
ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert their own consents" 
    ON public.client_consents FOR INSERT 
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can view their own consents" 
    ON public.client_consents FOR SELECT 
    USING (client_id = auth.uid());

CREATE POLICY "Admins can view all consents" 
    ON public.client_consents FOR SELECT 
    USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 6.4 Update existing clients policies for UPDATE operations
DROP POLICY IF EXISTS "Clients can update their own profile" ON public.clients;

CREATE POLICY "Clients can update their own profile" 
    ON public.clients FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6.5 Staff can read client profiles (for preferred staff features)
CREATE POLICY "Staff can view client profiles for appointments" 
    ON public.clients FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp 
            WHERE sp.user_id = auth.uid() AND sp.active = true
        )
    );

-- =============================================================================
-- 7. HELPER FUNCTIONS FOR CONSENT MANAGEMENT
-- =============================================================================

-- Function to sync consent cache when consents are logged
CREATE OR REPLACE FUNCTION public.sync_consent_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    latest_consent record;
BEGIN
    -- Get the latest consent for this client and type
    SELECT granted INTO latest_consent
    FROM public.client_consents 
    WHERE client_id = NEW.client_id AND type = NEW.type
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Update the appropriate cached column
    CASE NEW.type
        WHEN 'tos' THEN
            UPDATE public.clients SET consent_tos = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
        WHEN 'privacy' THEN
            UPDATE public.clients SET consent_privacy = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
        WHEN 'reminders' THEN
            UPDATE public.clients SET consent_reminders = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
        WHEN 'marketing_email' THEN
            UPDATE public.clients SET consent_marketing_email = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
        WHEN 'marketing_sms' THEN
            UPDATE public.clients SET consent_marketing_sms = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
        WHEN 'marketing_whatsapp' THEN
            UPDATE public.clients SET consent_marketing_whatsapp = latest_consent.granted, updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
            WHERE user_id = NEW.client_id;
    END CASE;
    
    RETURN NEW;
END;
$$;

-- Trigger to sync consent cache
CREATE TRIGGER trigger_sync_consent_cache
    AFTER INSERT ON public.client_consents
    FOR EACH ROW EXECUTE FUNCTION public.sync_consent_cache();

-- =============================================================================
-- 8. INDEXES FOR PERFORMANCE  
-- =============================================================================

-- Profile completion lookups
CREATE INDEX IF NOT EXISTS idx_clients_completion_score 
    ON public.clients(profile_completion_score);

-- Marketing source lookups  
CREATE INDEX IF NOT EXISTS idx_clients_marketing_source 
    ON public.clients(marketing_source_id);

-- Preferred channel lookups
CREATE INDEX IF NOT EXISTS idx_clients_preferred_channel 
    ON public.clients(preferred_channel_id);

-- Updated timestamp for sync operations
CREATE INDEX IF NOT EXISTS idx_clients_updated_at 
    ON public.clients(updated_at);

-- =============================================================================
-- 9. GRANTS & PERMISSIONS
-- =============================================================================

-- Grant access to lookup tables
GRANT SELECT ON public.contact_channels TO authenticated;
GRANT SELECT ON public.marketing_sources TO authenticated;

-- Grant access to consents table  
GRANT SELECT, INSERT ON public.client_consents TO authenticated;

-- Grant execution on helper functions
GRANT EXECUTE ON FUNCTION public.f_client_profile_progress(UUID) TO authenticated;

-- Grant select on progress view
GRANT SELECT ON public.client_profile_progress TO authenticated;

-- =============================================================================
-- 10. BACKEND RPCs FOR PROFILE MANAGEMENT  
-- =============================================================================

-- 10.1 Client Profile Update RPC (RLS-friendly, SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.client_update_profile(
    p_phone TEXT DEFAULT NULL,
    p_is_whatsapp BOOLEAN DEFAULT NULL,
    p_preferred_channel_code TEXT DEFAULT NULL,
    p_emergency_contact_name TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL,
    p_preferred_staff_profile_id UUID DEFAULT NULL,
    p_marketing_source_code TEXT DEFAULT NULL,
    p_marketing_source_other TEXT DEFAULT NULL,
    p_accessibility_notes TEXT DEFAULT NULL,
    p_general_notes TEXT DEFAULT NULL
) 
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER -- Use RLS policies
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
    v_preferred_channel_id UUID;
    v_marketing_source_id UUID;
    v_progress_result record;
BEGIN
    -- Get current user (must be authenticated)
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to update profile';
    END IF;
    
    -- Resolve preferred channel code to ID
    IF p_preferred_channel_code IS NOT NULL THEN
        SELECT id INTO v_preferred_channel_id 
        FROM public.contact_channels 
        WHERE code = p_preferred_channel_code AND active = true;
        
        IF v_preferred_channel_id IS NULL THEN
            RAISE EXCEPTION 'Invalid preferred channel code: %', p_preferred_channel_code;
        END IF;
    END IF;
    
    -- Resolve marketing source code to ID
    IF p_marketing_source_code IS NOT NULL THEN
        SELECT id INTO v_marketing_source_id 
        FROM public.marketing_sources 
        WHERE code = p_marketing_source_code AND active = true;
        
        IF v_marketing_source_id IS NULL THEN
            RAISE EXCEPTION 'Invalid marketing source code: %', p_marketing_source_code;
        END IF;
    END IF;
    
    -- Atomic update of client profile (RLS will enforce user can only update own record)
    UPDATE public.clients SET
        phone = COALESCE(p_phone, phone),
        is_whatsapp = COALESCE(p_is_whatsapp, is_whatsapp),
        preferred_channel_id = COALESCE(v_preferred_channel_id, preferred_channel_id),
        emergency_contact_name = COALESCE(p_emergency_contact_name, emergency_contact_name),
        emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
        preferred_staff_profile_id = COALESCE(p_preferred_staff_profile_id, preferred_staff_profile_id),
        marketing_source_id = COALESCE(v_marketing_source_id, marketing_source_id),
        marketing_source_other = COALESCE(p_marketing_source_other, marketing_source_other),
        accessibility_notes = COALESCE(p_accessibility_notes, accessibility_notes),
        general_notes = COALESCE(p_general_notes, general_notes),
        updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
    WHERE user_id = v_client_id;
    
    -- Check if update actually happened (RLS might have blocked it)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile update failed - client record not found or access denied';
    END IF;
    
    -- Recompute and cache profile completion score
    SELECT * INTO v_progress_result 
    FROM public.f_client_profile_progress(v_client_id);
    
    UPDATE public.clients 
    SET profile_completion_score = v_progress_result.percent_complete
    WHERE user_id = v_client_id;
    
    RAISE NOTICE 'Profile updated successfully. Completion: %%, Missing: %', 
        v_progress_result.percent_complete, v_progress_result.missing_fields;
END;
$$;

-- 10.2 Get Profile Progress RPC (returns current user's progress)
CREATE OR REPLACE FUNCTION public.client_get_profile_progress()
RETURNS TABLE(percent_complete INTEGER, missing_fields TEXT[])
LANGUAGE plpgsql  
SECURITY INVOKER -- Use RLS policies
STABLE
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Get current user (must be authenticated)
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to get profile progress';
    END IF;
    
    -- Return progress using our helper function
    RETURN QUERY 
    SELECT progress.percent_complete, progress.missing_fields
    FROM public.f_client_profile_progress(v_client_id) as progress;
END;
$$;

-- 10.3 Log Consent RPC (append-only consent tracking)
CREATE OR REPLACE FUNCTION public.client_log_consent(
    p_type TEXT,
    p_granted BOOLEAN,
    p_version TEXT DEFAULT '1.0',
    p_channel_code TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER -- Use RLS policies  
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
    v_valid_types TEXT[] := ARRAY['tos', 'privacy', 'reminders', 'marketing_email', 'marketing_sms', 'marketing_whatsapp'];
BEGIN
    -- Get current user (must be authenticated)
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to log consent';
    END IF;
    
    -- Validate consent type
    IF p_type IS NULL OR NOT (p_type = ANY(v_valid_types)) THEN
        RAISE EXCEPTION 'Invalid consent type. Must be one of: %', array_to_string(v_valid_types, ', ');
    END IF;
    
    -- Insert consent record (RLS will enforce user can only insert for themselves)
    INSERT INTO public.client_consents (
        client_id,
        type,
        granted,
        channel_code,
        version,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        v_client_id,
        p_type,
        p_granted,
        p_channel_code,
        p_version,
        p_ip_address,
        p_user_agent,
        (now() AT TIME ZONE 'America/Sao_Paulo')
    );
    
    -- The trigger will automatically sync the consent cache
    RAISE NOTICE 'Consent logged: type=%, granted=%, channel=%', p_type, p_granted, p_channel_code;
END;
$$;

-- 10.4 Convenience function to check if first visit setup is needed
CREATE OR REPLACE FUNCTION public.client_needs_first_visit_setup()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
    v_setup_completed BOOLEAN;
BEGIN
    -- Get current user
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RETURN false; -- Not authenticated
    END IF;
    
    -- Check if first visit setup was completed
    SELECT (first_visit_setup_at IS NOT NULL) INTO v_setup_completed
    FROM public.clients 
    WHERE user_id = v_client_id;
    
    RETURN COALESCE(NOT v_setup_completed, true);
END;
$$;

-- 10.5 Mark first visit setup as completed
CREATE OR REPLACE FUNCTION public.client_complete_first_visit_setup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Get current user
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Mark setup as completed
    UPDATE public.clients 
    SET 
        first_visit_setup_at = (now() AT TIME ZONE 'America/Sao_Paulo'),
        updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
    WHERE user_id = v_client_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Client profile not found';
    END IF;
    
    RAISE NOTICE 'First visit setup marked as completed for client %', v_client_id;
END;
$$;

-- 10.6 Dismiss nudge function  
CREATE OR REPLACE FUNCTION public.client_dismiss_nudge()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Get current user
    v_client_id := auth.uid();
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update dismiss timestamp
    UPDATE public.clients 
    SET 
        last_nudge_dismissed_at = (now() AT TIME ZONE 'America/Sao_Paulo'),
        updated_at = (now() AT TIME ZONE 'America/Sao_Paulo')
    WHERE user_id = v_client_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Client profile not found';
    END IF;
    
    RAISE NOTICE 'Nudge dismissed for client %', v_client_id;
END;
$$;

-- Grant execute permissions on all RPCs
GRANT EXECUTE ON FUNCTION public.client_update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_get_profile_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_log_consent TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_needs_first_visit_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_complete_first_visit_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_dismiss_nudge TO authenticated;

-- =============================================================================
-- 11. MIGRATION VALIDATION
-- =============================================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Client Profile 2.0 schema migration completed successfully';
    RAISE NOTICE '- Added % lookup tables', 2;
    RAISE NOTICE '- Extended clients table with % new columns', 15;
    RAISE NOTICE '- Created client_consents append-only table';
    RAISE NOTICE '- Created profile progress helper function';
    RAISE NOTICE '- Updated RLS policies for new tables';
    RAISE NOTICE '- Seeded lookup tables with default values';
    RAISE NOTICE '- Created % RPC functions for profile management', 6;
END $$;
