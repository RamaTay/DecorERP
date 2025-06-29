/*
  # Add size management system

  1. New Tables
    - `sizes`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `display_order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `product_sizes`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `size_id` (uuid, references sizes)
      - `stock_level` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Remove stock_level from products table
    - Add unique constraint on product_id and size_id combination

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create sizes table
CREATE TABLE sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_sizes table
CREATE TABLE product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size_id uuid REFERENCES sizes(id) ON DELETE RESTRICT,
  stock_level integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, size_id)
);

-- Remove stock_level from products
ALTER TABLE products DROP COLUMN stock_level;

-- Enable RLS
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sizes
CREATE POLICY "All authenticated users can view sizes"
  ON sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage sizes"
  ON sizes FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for product_sizes
CREATE POLICY "All authenticated users can view product sizes"
  ON product_sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product sizes"
  ON product_sizes FOR ALL
  TO authenticated
  USING (true);

-- Insert common sizes
INSERT INTO sizes (name, display_order) VALUES
  ('XS', 10),
  ('S', 20),
  ('M', 30),
  ('L', 40),
  ('XL', 50),
  ('XXL', 60);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_sizes_updated_at
  BEFORE UPDATE ON sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON product_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();