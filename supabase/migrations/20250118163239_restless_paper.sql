/*
  # Add unit sizes to sales

  1. Changes
    - Add unit_size_id column to sale_items table
    - Update stock management trigger to handle unit sizes
    - Add foreign key constraint and index for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add unit_size_id to sale_items
ALTER TABLE sale_items
ADD COLUMN unit_size_id uuid REFERENCES unit_sizes(id);

-- Create index for performance
CREATE INDEX idx_sale_items_unit_size ON sale_items(unit_size_id);

-- Drop existing trigger if exists (for safety)
DROP TRIGGER IF EXISTS update_stock_on_sale_status_change ON sales;
DROP FUNCTION IF EXISTS update_stock_on_sale();

-- Create updated function to handle unit sizes
CREATE OR REPLACE FUNCTION update_stock_on_sale() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Decrease stock for each unit size
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level - si.quantity
    FROM sale_items si
    WHERE si.sale_id = NEW.id
    AND si.unit_size_id = pus.unit_size_id
    AND si.product_id = pus.product_id;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    -- Increase stock back for each unit size
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level + si.quantity
    FROM sale_items si
    WHERE si.sale_id = NEW.id
    AND si.unit_size_id = pus.unit_size_id
    AND si.product_id = pus.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER update_stock_on_sale_status_change
  AFTER UPDATE ON sales
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_stock_on_sale();