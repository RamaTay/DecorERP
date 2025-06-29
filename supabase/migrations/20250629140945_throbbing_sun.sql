/*
  # Create test user account

  1. New User
    - Create a test user account with email rama@decor.com
    - Set up the user profile in the public.users table
    - Use a simple password for testing

  2. Security
    - User will be able to log in immediately
    - Profile will be created in public.users table
*/

-- Insert test user into auth.users (this simulates user registration)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'rama@decor.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Rama Admin"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding user profile
INSERT INTO public.users (
  id,
  email,
  full_name,
  role
) 
SELECT 
  au.id,
  'rama@decor.com',
  'Rama Admin',
  'admin'
FROM auth.users au 
WHERE au.email = 'rama@decor.com'
ON CONFLICT (id) DO NOTHING;