
-- Restore/create the required profile tables so trigger doesn't fail

CREATE TABLE IF NOT EXISTS public.clients (
  user_id UUID PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS public.groomers (
  user_id UUID PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS public.veterinarians (
  user_id UUID PRIMARY KEY,
  name TEXT
);
