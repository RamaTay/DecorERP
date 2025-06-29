/*
  # Add price lists management

  1. New Tables
    - `price_lists`: Stores price list metadata
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `price_list_items`: Stores individual prices for each product/size combination
      - `id` (uuid, primary key)
      - `price_list_id` (uuid, references price_lists)
      - `product_id` (uuid, references products)
      - `unit_size_id` (uuid, references unit_sizes)
      - `price` (decimal)
      - `previous_price` (decimal)
      - `price_changed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create price_lists table
CREATE TABLE price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price_list_items table
CREATE TABLE price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  unit_size_id uuid REFERENCES unit_sizes(id) ON DELETE CASCADE,
  price decimal NOT NULL DEFAULT 0 CHECK (price >= 0),
  previous_price decimal CHECK (previous_price >= 0),
  price_changed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(price_list_id, product_id, unit_size_id)
);

-- Add triggers for updated_at
CREATE TRIGGER update_price_lists_updated_at
  BEFORE UPDATE ON price_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_list_items_updated_at
  BEFORE UPDATE ON price_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_lists
CREATE POLICY "All authenticated users can view price lists"
  ON price_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage price lists"
  ON price_lists FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for price_list_items
CREATE POLICY "All authenticated users can view price list items"
  ON price_list_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage price list items"
  ON price_list_items FOR ALL
  TO authenticated
  USING (true);