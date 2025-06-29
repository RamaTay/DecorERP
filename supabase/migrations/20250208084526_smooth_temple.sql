/*
  # Add brands support
  
  1. New Tables
    - `brands`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add brand_id to products table
    - Add RLS policies for brands table
*/

-- Create brands table
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add brand_id to products
ALTER TABLE products
ADD COLUMN brand_id uuid REFERENCES brands(id);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands
CREATE POLICY "View brands"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create brands"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Delete brands"
  ON brands FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some common brands
INSERT INTO brands (name) VALUES
  ('Generic'),
  ('House Brand');

-- Set default brand for existing products
UPDATE products 
SET brand_id = (SELECT id FROM brands WHERE name = 'Generic' LIMIT 1)
WHERE brand_id IS NULL;