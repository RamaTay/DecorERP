/*
  # Fix products table RLS policies

  1. Changes
    - Add policy to allow authenticated users to create products
    - Add policy to allow authenticated users to update products
    - Add policy to allow authenticated users to delete products

  2. Security
    - Ensures authenticated users can perform all CRUD operations on products
    - Maintains existing RLS policies
*/

-- Allow authenticated users to create products
CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update products
CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete products
CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);