/*
  # Move SKU from products to product_unit_sizes

  1. Changes
    - Add SKU column to product_unit_sizes table
    - Generate unique SKUs for existing product-size combinations
    - Add unique constraint on SKU
    - Remove SKU column from products table

  2. Notes
    - This is a breaking change that requires data migration
    - SKUs will now be unique per product-size combination
    - Uses a more robust SKU generation strategy
*/

-- Add SKU column to product_unit_sizes (initially nullable)
ALTER TABLE product_unit_sizes
ADD COLUMN sku text;

-- Function to generate SKU for product unit sizes with counter
CREATE OR REPLACE FUNCTION generate_product_size_sku(product_name text, size_name text)
RETURNS text AS $$
DECLARE
  base_sku text;
  counter integer := 1;
  new_sku text;
  size_code text;
  product_code text;
BEGIN
  -- Create more distinctive product code (first 3 letters + first consonant after that if exists)
  product_code := UPPER(REGEXP_REPLACE(
    SUBSTR(REGEXP_REPLACE(product_name, '[^a-zA-Z0-9]', ''), 1, 3) || 
    COALESCE(SUBSTR(REGEXP_REPLACE(REGEXP_REPLACE(product_name, '[^a-zA-Z0-9]', ''), '[aeiouAEIOU]', ''), 4, 1), ''),
    '[^A-Z0-9]',
    ''
  ));

  -- Create size code (first 2 letters + first number if exists)
  size_code := UPPER(
    SUBSTR(REGEXP_REPLACE(size_name, '[^a-zA-Z0-9]', ''), 1, 2) || 
    COALESCE(SUBSTR(REGEXP_REPLACE(size_name, '[^0-9]', ''), 1, 1), '')
  );
  
  -- Combine to create base SKU
  base_sku := product_code || '-' || size_code;
  
  -- Initial SKU attempt
  new_sku := base_sku;
  
  -- Keep trying until we find a unique SKU
  WHILE EXISTS (
    SELECT 1 FROM product_unit_sizes WHERE sku = new_sku
  ) LOOP
    counter := counter + 1;
    new_sku := base_sku || '-' || counter;
  END LOOP;
  
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing SKUs with DO block for better error handling
DO $$ 
DECLARE 
  r RECORD;
  new_sku text;
  used_skus text[];
BEGIN
  -- First pass: use existing SKUs for first size of each product
  FOR r IN (
    SELECT DISTINCT ON (p.id)
      p.id as product_id,
      p.name as product_name,
      p.sku as old_sku,
      pus.id as unit_size_id,
      us.name as size_name
    FROM products p
    JOIN product_unit_sizes pus ON pus.product_id = p.id
    JOIN unit_sizes us ON us.id = pus.unit_size_id
    ORDER BY p.id, pus.id
  ) LOOP
    IF r.old_sku IS NOT NULL THEN
      UPDATE product_unit_sizes 
      SET sku = r.old_sku
      WHERE id = r.unit_size_id;
      used_skus := array_append(used_skus, r.old_sku);
    END IF;
  END LOOP;

  -- Second pass: generate new SKUs for remaining sizes
  FOR r IN (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      pus.id as unit_size_id,
      us.name as size_name,
      pus.sku as current_sku
    FROM products p
    JOIN product_unit_sizes pus ON pus.product_id = p.id
    JOIN unit_sizes us ON us.id = pus.unit_size_id
    WHERE pus.sku IS NULL
    ORDER BY p.id, pus.id
  ) LOOP
    -- Generate new unique SKU
    new_sku := generate_product_size_sku(r.product_name, r.size_name);
    
    -- Ensure SKU is unique
    WHILE new_sku = ANY(used_skus) LOOP
      new_sku := generate_product_size_sku(r.product_name, r.size_name);
    END LOOP;
    
    -- Update SKU
    UPDATE product_unit_sizes 
    SET sku = new_sku
    WHERE id = r.unit_size_id;
    
    used_skus := array_append(used_skus, new_sku);
  END LOOP;
END $$;

-- Verify all product unit sizes have SKUs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM product_unit_sizes WHERE sku IS NULL) THEN
    RAISE EXCEPTION 'Some product unit sizes are missing SKUs';
  END IF;
END $$;

-- Add unique constraint
ALTER TABLE product_unit_sizes
ADD CONSTRAINT product_unit_sizes_sku_unique UNIQUE (sku);

-- Make SKU required
ALTER TABLE product_unit_sizes
ALTER COLUMN sku SET NOT NULL;

-- Drop SKU column from products
ALTER TABLE products
DROP COLUMN sku;