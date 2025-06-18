-- Create a demo admin user (for development/testing purposes)
-- Note: In production, you should create admin users through proper channels

-- First, we need to insert into auth.users (this is typically done by Supabase Auth)
-- For demo purposes, we'll create a profile and assume the auth user exists

-- Insert demo admin profile
INSERT INTO profiles (id, email, full_name, is_admin) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@example.com',
  'Demo Admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  is_admin = true,
  full_name = 'Demo Admin';

-- Note: The actual auth user needs to be created through Supabase Auth
-- This script only creates the profile. You'll need to:
-- 1. Sign up with admin@example.com through the UI
-- 2. Then run this script to grant admin privileges
-- OR manually update the profile in the Supabase dashboard
