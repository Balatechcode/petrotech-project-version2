-- Update auth configuration to handle email verification properly
-- This ensures proper email verification flow

-- Create a function to handle email confirmation
CREATE OR REPLACE FUNCTION confirm_user_email(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Update the user's email_confirmed_at timestamp
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = user_id AND email_confirmed_at IS NULL;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    false
  FROM auth.users u
  WHERE u.id = user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually grant admin access (for demo purposes)
CREATE OR REPLACE FUNCTION grant_admin_access(user_email TEXT)
RETURNS boolean AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update profile to grant admin access
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION confirm_user_email TO anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_admin_access TO anon, authenticated;
