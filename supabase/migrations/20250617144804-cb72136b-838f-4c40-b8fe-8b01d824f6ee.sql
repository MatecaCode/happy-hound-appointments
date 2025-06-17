
-- 1️⃣ Remove the unnecessary trigger and function since we're explicitly setting user_id
DROP TRIGGER IF EXISTS assign_user_id ON public.pets;
DROP FUNCTION IF EXISTS public.set_pet_user_id();

-- 3️⃣ Add UNIQUE constraint to prevent duplicate pet names per user
ALTER TABLE public.pets
ADD CONSTRAINT unique_pet_name_per_user
UNIQUE (user_id, name);

-- Note: We're keeping age and breed as optional (nullable) since the form allows empty values
-- and it's reasonable for users to not know or want to specify these details
