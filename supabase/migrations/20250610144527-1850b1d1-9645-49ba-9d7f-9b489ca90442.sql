
-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_role text;
    user_name text;
BEGIN
    -- Get role and name from user metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
    
    -- Insert into appropriate table based on role
    IF user_role = 'client' THEN
        INSERT INTO public.clients (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'groomer' THEN
        INSERT INTO public.groomers (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'vet' THEN
        INSERT INTO public.veterinarians (user_id, name)
        VALUES (NEW.id, user_name)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger that automatically creates profiles when users sign up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- For existing users who don't have profiles yet, let's create a function to backfill them
CREATE OR REPLACE FUNCTION public.backfill_user_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record record;
    user_role text;
    user_name text;
BEGIN
    -- Loop through all users who don't have profiles
    FOR user_record IN 
        SELECT au.id, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.clients c ON au.id = c.user_id
        LEFT JOIN public.groomers g ON au.id = g.user_id  
        LEFT JOIN public.veterinarians v ON au.id = v.user_id
        WHERE c.user_id IS NULL AND g.user_id IS NULL AND v.user_id IS NULL
    LOOP
        -- Get role and name from user metadata
        user_role := COALESCE(user_record.raw_user_meta_data->>'role', 'client');
        user_name := COALESCE(user_record.raw_user_meta_data->>'name', 'Usuário');
        
        -- Insert into appropriate table based on role
        IF user_role = 'client' THEN
            INSERT INTO public.clients (user_id, name)
            VALUES (user_record.id, user_name)
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF user_role = 'groomer' THEN
            INSERT INTO public.groomers (user_id, name)
            VALUES (user_record.id, user_name)
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF user_role = 'vet' THEN
            INSERT INTO public.veterinarians (user_id, name)
            VALUES (user_record.id, user_name)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;

-- Run the backfill function to create profiles for existing users
SELECT public.backfill_user_profiles();
