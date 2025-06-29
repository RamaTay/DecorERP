/*
  # Remove price and cost fields from products table
  
  1. Changes
    - Remove price and cost columns from products table
    - Remove price and cost check constraints
  
  2. Rationale
    - Product prices are now managed through price lists for each unit size
    - Product costs are determined through purchase invoices
    - No need to store these values directly on the product
*/

-- Remove price and cost columns
ALTER TABLE products
DROP COLUMN price,
DROP COLUMN cost;