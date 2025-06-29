/*
  # Add unit size management system

  1. New Tables
    - `unit_sizes`
      - `id` (uuid, primary key)
      - `name` (text, unique) - e.g., Bucket, Gallon, Quart
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `product_unit_sizes`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `unit_size_id` (uuid, references unit_sizes)
      - `stock_level` (integer)
      - `price` (decimal) - Allow different prices per size
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Remove existing size-related tables
    - Add unique constraint on product_id and unit_size_id combination

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Drop existing size tables
DROP TABLE IF EXISTS product_sizes;
DROP TABLE IF EXISTS sizes;

-- Create unit_sizes table
CREATE TABLE unit_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_unit_sizes table
CREATE TABLE product_unit_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  unit_size_id uuid REFERENCES unit_sizes(id) ON DELETE RESTRICT,
  stock_level integer NOT NULL DEFAULT 0,
  price decimal NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, unit_size_id)
);

-- Enable RLS
ALTER TABLE unit_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_unit_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unit_sizes
CREATE POLICY "All authenticated users can view unit sizes"
  ON unit_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage unit sizes"
  ON unit_sizes FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for product_unit_sizes
CREATE POLICY "All authenticated users can view product unit sizes"
  ON product_unit_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product unit sizes"
  ON product_unit_sizes FOR ALL
  TO authenticated
  USING (true);

-- Insert common unit sizes
INSERT INTO unit_sizes (name) VALUES
  ('Bucket'),
  ('Gallon'),
  ('Quart'),
  ('Liter'),
  ('Bottle'),
  ('Box');

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_unit_sizes_updated_at
  BEFORE UPDATE ON unit_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_unit_sizes_updated_at
  BEFORE UPDATE ON product_unit_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();