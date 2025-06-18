-- Create storage bucket for templates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for template uploads (admin only)
CREATE POLICY "Admins can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Create policy for public template access
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- Create function to increment downloads
CREATE OR REPLACE FUNCTION increment_downloads(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE templates 
  SET downloads = downloads + 1 
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
