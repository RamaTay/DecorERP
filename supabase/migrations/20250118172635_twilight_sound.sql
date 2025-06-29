/*
  # Add expense categories table

  1. New Tables
    - `expense_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `expense_categories` table
    - Add policies for authenticated users
*/

-- Create expense categories table
CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO expense_categories (name) VALUES
  ('Inventory'),
  ('Utilities'),
  ('Rent'),
  ('Salaries'),
  ('Marketing'),
  ('Equipment'),
  ('Maintenance'),
  ('Office Supplies'),
  ('Insurance'),
  ('Other');