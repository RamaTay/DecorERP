/*
  # Add unit sizes to purchase items

  1. Changes
    - Add unit_size_id column to purchase_items table
    - Update stock update trigger to handle unit sizes

  2. Notes
    - Ensures stock levels are updated correctly for specific unit sizes
    - Maintains referential integrity with unit_sizes table
*/

-- Add unit_size_id to purchase_items
ALTER TABLE purchase_items
ADD COLUMN unit_size_id uuid REFERENCES unit_sizes(id);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_stock_on_purchase_status_change ON purchase_invoices;
DROP FUNCTION IF EXISTS update_stock_on_purchase();

-- Create updated function to handle unit sizes
CREATE OR REPLACE FUNCTION update_stock_on_purchase() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Increase stock for each unit size
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level + pi.quantity
    FROM purchase_items pi
    WHERE pi.purchase_invoice_id = NEW.id
    AND pi.unit_size_id = pus.unit_size_id
    AND pi.product_id = pus.product_id;
  ELSIF NEW.status != 'received' AND OLD.status = 'received' THEN
    -- Decrease stock for each unit size
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level - pi.quantity
    FROM purchase_items pi
    WHERE pi.purchase_invoice_id = NEW.id
    AND pi.unit_size_id = pus.unit_size_id
    AND pi.product_id = pus.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER update_stock_on_purchase_status_change
  AFTER UPDATE ON purchase_invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_stock_on_purchase();