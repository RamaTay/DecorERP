/*
  # Create test user account

  1. Changes
    - Create a test user profile in the public users table
    - Use a fixed UUID that can be used for testing
    - The actual auth user will be created through the Supabase Auth API

  2. Notes
    - This creates the user profile that will be linked when someone signs up with rama@decor.com
    - The auth.users entry must be created through Supabase Auth signup process
*/

-- Create a test user profile with a known UUID
-- This UUID will be used when the user signs up through the auth system
INSERT INTO public.users (
  id,
  email,
  full_name,
  role
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'rama@decor.com',
  'Rama Admin',
  'admin'
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Note: The actual authentication user must be created through Supabase Auth
-- You can do this by:
-- 1. Going to your Supabase dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" 
-- 4. Use email: rama@decor.com and password: password123
-- 5. Set the user ID to: 550e8400-e29b-41d4-a716-446655440000