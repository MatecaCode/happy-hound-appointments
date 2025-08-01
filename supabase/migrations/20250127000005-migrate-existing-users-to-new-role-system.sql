-- Migrate existing users from user_roles_legacy to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, role
FROM public.user_roles_legacy
WHERE user_id IS NOT NULL 
  AND role IS NOT NULL
  AND role IN ('admin', 'staff', 'client')
ON CONFLICT (user_id) DO NOTHING;

-- For users who don't have a role yet, assign them as 'client'
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT id, 'client'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
  AND id NOT IN (SELECT user_id FROM public.user_roles_legacy)
ON CONFLICT (user_id) DO NOTHING;

-- For staff members who have staff_profiles but no role, assign them as 'staff'
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT sp.user_id, 'staff'
FROM public.staff_profiles sp
WHERE sp.user_id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id) DO NOTHING; 