/*
  # Move minimum stock level to product unit sizes
  
  1. Changes
    - Add min_stock_level column to product_unit_sizes table
    - Remove min_stock_level from products table
  
  2. Notes
    - Adds min_stock_level with default 0 and non-null constraint
    - Removes the column from products table since it's now per unit size
*/

-- Add min_stock_level to product_unit_sizes
ALTER TABLE product_unit_sizes
ADD COLUMN min_stock_level integer NOT NULL DEFAULT 0;

-- Remove min_stock_level from products
ALTER TABLE products
DROP COLUMN min_stock_level;