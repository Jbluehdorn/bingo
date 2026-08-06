-- Add custom rules to tiles
ALTER TABLE tiles ADD COLUMN custom_rules TEXT;

-- Add bonus pet tile fields to teams
ALTER TABLE teams ADD COLUMN pet_image_url TEXT;
ALTER TABLE teams ADD COLUMN pet_name TEXT;
