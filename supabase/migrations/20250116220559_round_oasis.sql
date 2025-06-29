/*
  # Add Purchase Invoices System

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `contact_person` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `purchase_invoices`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `user_id` (uuid, references users)
      - `invoice_number` (text, unique)
      - `date` (date)
      - `total_amount` (decimal)
      - `status` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `payment_status` (text)
      - `payment_due_date` (date)

    - `purchase_items`
      - `id` (uuid, primary key)
      - `purchase_invoice_id` (uuid, references purchase_invoices)
      - `product_id` (uuid, references products)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `subtotal` (decimal)

  2. Security
    - Enable RLS on all new tables
    - Add policies for viewing and managing purchase records
*/

-- Create suppliers table
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_invoices table
CREATE TABLE purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount decimal NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_due_date date
);

-- Create purchase_items table
CREATE TABLE purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid REFERENCES purchase_invoices(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal NOT NULL CHECK (unit_price >= 0),
  subtotal decimal NOT NULL CHECK (subtotal >= 0)
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "All authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for purchase_invoices
CREATE POLICY "All authenticated users can view purchase invoices"
  ON purchase_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create purchase invoices"
  ON purchase_invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase invoices"
  ON purchase_invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase invoices"
  ON purchase_invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for purchase_items
CREATE POLICY "All authenticated users can view purchase items"
  ON purchase_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage purchase items"
  ON purchase_items FOR ALL
  TO authenticated
  USING (true);

-- Add function to update product stock on purchase completion
CREATE OR REPLACE FUNCTION update_stock_on_purchase() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    UPDATE products p
    SET stock_level = p.stock_level + pi.quantity
    FROM purchase_items pi
    WHERE pi.purchase_invoice_id = NEW.id
    AND pi.product_id = p.id;
  ELSIF NEW.status != 'received' AND OLD.status = 'received' THEN
    UPDATE products p
    SET stock_level = p.stock_level - pi.quantity
    FROM purchase_items pi
    WHERE pi.purchase_invoice_id = NEW.id
    AND pi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER update_stock_on_purchase_status_change
  AFTER UPDATE ON purchase_invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_stock_on_purchase();