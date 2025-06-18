-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profiles table to handle potential issues
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE profiles ALTER COLUMN is_admin SET DEFAULT false;

-- Create a function to safely get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_profile(user_id UUID, user_email TEXT, user_full_name TEXT DEFAULT '')
RETURNS TABLE(id UUID, email TEXT, full_name TEXT, is_admin BOOLEAN) AS $$
BEGIN
  -- Try to get existing profile
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.is_admin
  FROM profiles p
  WHERE p.id = user_id;
  
  -- If no profile found, create one
  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, full_name, is_admin)
    VALUES (user_id, user_email, COALESCE(user_full_name, ''), false)
    ON CONFLICT (id) DO UPDATE SET
      email = user_email,
      full_name = COALESCE(user_full_name, profiles.full_name);
    
    RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.is_admin
    FROM profiles p
    WHERE p.id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.templates TO anon, authenticated;
GRANT ALL ON public.user_purchases TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_profile TO anon, authenticated;
