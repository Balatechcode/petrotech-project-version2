-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  photo_area JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 100, "height": 100}',
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin',
  downloads INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}'
);

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_purchases table for premium templates
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create text_templates table for pre-built text options
CREATE TABLE IF NOT EXISTS public.text_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content JSONB NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to increment downloads
CREATE OR REPLACE FUNCTION increment_downloads(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE templates 
  SET downloads = downloads + 1 
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample templates
INSERT INTO public.templates (name, category, image_url, photo_area, is_premium, price, tags) VALUES
('Elegant Wedding Frame', 'wedding', '/placeholder.svg?height=600&width=400', '{"x": 150, "y": 200, "width": 100, "height": 150}', false, 0.00, ARRAY['elegant', 'classic', 'white']),
('Birthday Celebration', 'birthday', '/placeholder.svg?height=600&width=400', '{"x": 100, "y": 150, "width": 200, "height": 200}', false, 0.00, ARRAY['colorful', 'fun', 'party']),
('Baby Shower Joy', 'baby-shower', '/placeholder.svg?height=600&width=400', '{"x": 120, "y": 180, "width": 160, "height": 160}', true, 2.99, ARRAY['cute', 'pastel', 'baby']),
('Engagement Bliss', 'engagement', '/placeholder.svg?height=600&width=400', '{"x": 130, "y": 170, "width": 140, "height": 180}', true, 1.99, ARRAY['romantic', 'gold', 'love']),
('Party Time', 'party', '/placeholder.svg?height=600&width=400', '{"x": 110, "y": 160, "width": 180, "height": 180}', false, 0.00, ARRAY['vibrant', 'celebration', 'modern'])
ON CONFLICT (id) DO NOTHING;

-- Insert sample text templates
INSERT INTO public.text_templates (name, category, content, is_premium, price) VALUES
('Classic Wedding', 'wedding', '{"title": "You are cordially invited", "subtitle": "to the wedding of", "message": "Join us as we celebrate our love and commitment to each other"}', false, 0.00),
('Birthday Bash', 'birthday', '{"title": "You''re Invited!", "subtitle": "to a Birthday Celebration", "message": "Come celebrate another year of awesome memories and great times ahead!"}', false, 0.00),
('Baby Shower Bliss', 'baby-shower', '{"title": "Baby Shower", "subtitle": "A little one is on the way!", "message": "Please join us as we shower the parents-to-be with love and best wishes"}', true, 1.99),
('Engagement Party', 'engagement', '{"title": "Save the Date", "subtitle": "Engagement Celebration", "message": "We''re engaged! Come celebrate this special milestone with us"}', true, 1.49),
('Party Invitation', 'party', '{"title": "Let''s Party!", "subtitle": "You''re invited to join the fun", "message": "Get ready for an unforgettable night of music, dancing, and great company"}', false, 0.00)
ON CONFLICT (id) DO NOTHING;
