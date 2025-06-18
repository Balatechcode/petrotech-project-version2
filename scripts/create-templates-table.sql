-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Create storage bucket for templates if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for templates bucket
CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'templates');
CREATE POLICY IF NOT EXISTS "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'templates');
CREATE POLICY IF NOT EXISTS "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'templates');
CREATE POLICY IF NOT EXISTS "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'templates');

-- Insert some sample templates
INSERT INTO public.templates (name, category, image_url, photo_area, is_premium, price, tags) VALUES
('Elegant Wedding Frame', 'wedding', '/placeholder.svg?height=600&width=400', '{"x": 150, "y": 200, "width": 100, "height": 150}', false, 0.00, ARRAY['elegant', 'classic', 'white']),
('Birthday Celebration', 'birthday', '/placeholder.svg?height=600&width=400', '{"x": 100, "y": 150, "width": 200, "height": 200}', false, 0.00, ARRAY['colorful', 'fun', 'party']),
('Baby Shower Joy', 'baby-shower', '/placeholder.svg?height=600&width=400', '{"x": 120, "y": 180, "width": 160, "height": 160}', true, 2.99, ARRAY['cute', 'pastel', 'baby']),
('Engagement Bliss', 'engagement', '/placeholder.svg?height=600&width=400', '{"x": 130, "y": 170, "width": 140, "height": 180}', true, 1.99, ARRAY['romantic', 'gold', 'love']),
('Party Time', 'party', '/placeholder.svg?height=600&width=400', '{"x": 110, "y": 160, "width": 180, "height": 180}', false, 0.00, ARRAY['vibrant', 'celebration', 'modern'])
ON CONFLICT (id) DO NOTHING;
