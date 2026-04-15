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
-- Try to find existing user by email, or skip if not found
BEGIN;

-- Create clinic if admin user exists
INSERT INTO public.clinics (name, slug, owner_user_id)
SELECT
  'Majedul Hoque Clinic',
  'majedul-clinic-' || extract(epoch from now())::text,
  id
FROM auth.users
WHERE email = 'majedulhoqueofficial@gmail.com'
ON CONFLICT DO NOTHING;

-- Create user profile
INSERT INTO public.user_profiles (id, full_name, default_clinic_id)
SELECT
  u.id,
  'Majedul Hoque Shakil',
  c.id
FROM auth.users u
JOIN public.clinics c ON c.owner_user_id = u.id
WHERE u.email = 'majedulhoqueofficial@gmail.com'
ON CONFLICT DO NOTHING;

-- Create clinic membership with admin role
INSERT INTO public.clinic_memberships (clinic_id, user_id, role, status)
SELECT
  c.id,
  u.id,
  'clinic_admin',
  'active'
FROM auth.users u
JOIN public.clinics c ON c.owner_user_id = u.id
WHERE u.email = 'majedulhoqueofficial@gmail.com'
ON CONFLICT DO NOTHING;

COMMIT;
