-- Create text_templates table for pre-built text content
CREATE TABLE IF NOT EXISTS text_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content JSONB NOT NULL, -- Stores names_text, date_text, venue_text, etc.
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- Add text_templates to user_purchases to track purchased text templates
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS text_template_id UUID REFERENCES text_templates(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE text_templates ENABLE ROW LEVEL SECURITY;

-- Text templates policies
CREATE POLICY "Text templates are viewable by everyone" ON text_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert text templates" ON text_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update text templates" ON text_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Insert sample text templates
INSERT INTO text_templates (title, category, content, is_premium, price) VALUES
(
  'Elegant Wedding Invitation', 
  'wedding', 
  '{"names_text": "John & Jane Smith", "date_text": "Saturday, June 15, 2024 at 3:00 PM", "venue_text": "The Grand Ballroom\n123 Elegant Avenue\nNew York, NY 10001", "message_text": "Together with their families, request the honor of your presence as they join in marriage"}',
  true,
  2.99
),
(
  'Casual Wedding Invitation', 
  'wedding', 
  '{"names_text": "John & Jane", "date_text": "June 15, 2024 | 3:00 PM", "venue_text": "Sunset Beach Resort\nMalibu, California", "message_text": "Join us as we tie the knot!"}',
  false,
  0.00
),
(
  'Formal Birthday Celebration', 
  'birthday', 
  '{"names_text": "Mr. James Wilson", "date_text": "Saturday, August 10, 2024 at 7:00 PM", "venue_text": "The Metropolitan Club\n1 E 60th St\nNew York, NY 10022", "message_text": "Please join us for a black-tie celebration of James''s 50th Birthday"}',
  true,
  1.99
),
(
  'Kids Birthday Party', 
  'birthday', 
  '{"names_text": "Emma is turning 5!", "date_text": "Sunday, July 20, 2024 | 2-5 PM", "venue_text": "Sunshine Park\n123 Play Street\nAnytown, USA", "message_text": "Join us for cake, games, and fun!"}',
  false,
  0.00
),
(
  'Elegant Baby Shower', 
  'baby-shower', 
  '{"names_text": "A Baby Shower for Jessica Smith", "date_text": "Sunday, September 8, 2024 | 1:00 PM", "venue_text": "The Garden Room\n555 Blossom Avenue\nSpringfield, IL", "message_text": "Please join us to celebrate the upcoming arrival of Baby Smith"}',
  true,
  1.99
),
(
  'Engagement Announcement', 
  'engagement', 
  '{"names_text": "Michael & Sarah", "date_text": "Engaged on May 15, 2024", "venue_text": "Celebration Dinner\nJuly 10, 2024 | 7:00 PM\nThe Vineyard Restaurant", "message_text": "We''re getting married! Join us to celebrate our engagement"}',
  false,
  0.00
);
