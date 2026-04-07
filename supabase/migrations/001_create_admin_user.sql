-- Migration: Create admin user setup
-- This creates the clinic and user profile structure
-- The auth user must be created separately via Supabase dashboard or API

-- First, you need to create the auth user via Supabase dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Create user"
-- 3. Email: majedulhoqueofficial@gmail.com
-- 4. Password: Majed123
-- 5. Confirm the user
-- 6. Copy the user ID and replace 'YOUR_USER_ID' below

-- Replace 'YOUR_USER_ID' with the actual user ID from step above
WITH user_id AS (
  SELECT 'YOUR_USER_ID'::uuid AS id
)
INSERT INTO public.clinics (name, slug, owner_user_id)
SELECT
  'Majedul Hoque Clinic',
  'majedul-clinic-' || extract(epoch from now())::text,
  id
FROM user_id
ON CONFLICT DO NOTHING;

-- Create user profile
INSERT INTO public.user_profiles (id, full_name, default_clinic_id)
SELECT
  id,
  'Majedul Hoque Shakil',
  c.id
FROM user_id u, public.clinics c
WHERE c.owner_user_id = u.id
ON CONFLICT DO NOTHING;

-- Create clinic membership with admin role
INSERT INTO public.clinic_memberships (clinic_id, user_id, role, status)
SELECT
  c.id,
  u.id,
  'clinic_admin',
  'active'
FROM user_id u, public.clinics c
WHERE c.owner_user_id = u.id
ON CONFLICT DO NOTHING;
