-- First, let's create a demo admin user directly in the auth.users table
-- Note: In production, you should use Supabase Auth UI or API for user creation

-- Insert demo admin user (this simulates what Supabase Auth would do)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID we just created
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  -- Insert or update the profile for admin user
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (admin_user_id, 'admin@example.com', 'Admin User', true)
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    full_name = 'Admin User';
END $$;
