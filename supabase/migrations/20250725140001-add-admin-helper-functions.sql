-- Add helper functions for admin operations

-- Function to check if a user has admin privileges
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT ur.role INTO user_role
    FROM user_roles ur
    WHERE ur.user_id = _user_id;
    
    -- Return true if the user has admin role
    RETURN user_role = 'admin';
END;
$$;

-- Function to get the current admin user ID
CREATE OR REPLACE FUNCTION public.get_admin_user_id()
RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return the current user's ID if they are an admin
    IF public.is_user_admin(auth.uid()) THEN
        RETURN auth.uid();
    ELSE
        RETURN NULL;
    END IF;
END;
$$; 