/*
  # Add Returns Handling System

  1. New Tables
    - `sale_returns`
      - Tracks returned sales items
      - Links to original sale
      - Handles partial and full returns
      - Tracks refund status and method
    
    - `sale_return_items`
      - Individual items being returned
      - Tracks return reason and condition
      - Links to original sale items
    
    - `purchase_returns`
      - Tracks items returned to suppliers
      - Links to original purchase
      - Handles credit notes and refunds
    
    - `purchase_return_items`
      - Individual items being returned to supplier
      - Tracks return reason and condition
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create sale returns table
CREATE TABLE sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  return_reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  refund_status text NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'refunded', 'credited', 'rejected')),
  refund_method text CHECK (refund_method IN ('cash', 'bank_transfer', 'credit_note')),
  refund_amount decimal,
  refund_date timestamptz,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
  syp_amount decimal,
  exchange_rate decimal,
  transaction_exchange_rate decimal,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sale return items table
CREATE TABLE sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_return_id uuid REFERENCES sale_returns(id) ON DELETE CASCADE NOT NULL,
  sale_item_id uuid REFERENCES sale_items(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  unit_size_id uuid REFERENCES unit_sizes(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal NOT NULL CHECK (unit_price >= 0),
  subtotal decimal NOT NULL CHECK (subtotal >= 0),
  return_reason text NOT NULL,
  item_condition text NOT NULL CHECK (item_condition IN ('new', 'opened', 'damaged')),
  created_at timestamptz DEFAULT now()
);

-- Create purchase returns table
CREATE TABLE purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchase_invoices(id) NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  return_reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  refund_status text NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'refunded', 'credited', 'rejected')),
  refund_method text CHECK (refund_method IN ('cash', 'bank_transfer', 'credit_note')),
  refund_amount decimal,
  refund_date timestamptz,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
  syp_amount decimal,
  exchange_rate decimal,
  transaction_exchange_rate decimal,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase return items table
CREATE TABLE purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id uuid REFERENCES purchase_returns(id) ON DELETE CASCADE NOT NULL,
  purchase_item_id uuid REFERENCES purchase_items(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  unit_size_id uuid REFERENCES unit_sizes(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal NOT NULL CHECK (unit_price >= 0),
  subtotal decimal NOT NULL CHECK (subtotal >= 0),
  return_reason text NOT NULL,
  item_condition text NOT NULL CHECK (item_condition IN ('new', 'damaged', 'incorrect')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sale returns
CREATE POLICY "View sale returns"
  ON sale_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create sale returns"
  ON sale_returns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own sale returns"
  ON sale_returns FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for sale return items
CREATE POLICY "View sale return items"
  ON sale_return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Manage sale return items"
  ON sale_return_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sale_returns
    WHERE sale_returns.id = sale_return_items.sale_return_id
    AND sale_returns.created_by = auth.uid()
  ));

-- RLS Policies for purchase returns
CREATE POLICY "View purchase returns"
  ON purchase_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create purchase returns"
  ON purchase_returns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own purchase returns"
  ON purchase_returns FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for purchase return items
CREATE POLICY "View purchase return items"
  ON purchase_return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Manage purchase return items"
  ON purchase_return_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_returns
    WHERE purchase_returns.id = purchase_return_items.purchase_return_id
    AND purchase_returns.created_by = auth.uid()
  ));

-- Function to update stock levels on sale return approval
CREATE OR REPLACE FUNCTION update_stock_on_sale_return() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Increase stock levels for returned items
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level + sri.quantity
    FROM sale_return_items sri
    WHERE sri.sale_return_id = NEW.id
    AND sri.unit_size_id = pus.unit_size_id
    AND sri.product_id = pus.product_id;
  ELSIF NEW.status != 'approved' AND OLD.status = 'approved' THEN
    -- Decrease stock levels if return is unapproved
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level - sri.quantity
    FROM sale_return_items sri
    WHERE sri.sale_return_id = NEW.id
    AND sri.unit_size_id = pus.unit_size_id
    AND sri.product_id = pus.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock levels on purchase return approval
CREATE OR REPLACE FUNCTION update_stock_on_purchase_return() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Decrease stock levels for returned items
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level - pri.quantity
    FROM purchase_return_items pri
    WHERE pri.purchase_return_id = NEW.id
    AND pri.unit_size_id = pus.unit_size_id
    AND pri.product_id = pus.product_id;
  ELSIF NEW.status != 'approved' AND OLD.status = 'approved' THEN
    -- Increase stock levels if return is unapproved
    UPDATE product_unit_sizes pus
    SET stock_level = pus.stock_level + pri.quantity
    FROM purchase_return_items pri
    WHERE pri.purchase_return_id = NEW.id
    AND pri.unit_size_id = pus.unit_size_id
    AND pri.product_id = pus.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for stock updates
CREATE TRIGGER update_stock_on_sale_return_status_change
  AFTER UPDATE ON sale_returns
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_stock_on_sale_return();

CREATE TRIGGER update_stock_on_purchase_return_status_change
  AFTER UPDATE ON purchase_returns
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_stock_on_purchase_return();

-- Add updated_at triggers
CREATE TRIGGER update_sale_returns_updated_at
  BEFORE UPDATE ON sale_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_returns_updated_at
  BEFORE UPDATE ON purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_sale_returns_sale_id ON sale_returns(sale_id);
CREATE INDEX idx_sale_returns_status ON sale_returns(status);
CREATE INDEX idx_sale_returns_refund_status ON sale_returns(refund_status);
CREATE INDEX idx_sale_return_items_return_id ON sale_return_items(sale_return_id);
CREATE INDEX idx_sale_return_items_product_id ON sale_return_items(product_id);

CREATE INDEX idx_purchase_returns_purchase_id ON purchase_returns(purchase_id);
CREATE INDEX idx_purchase_returns_status ON purchase_returns(status);
CREATE INDEX idx_purchase_returns_refund_status ON purchase_returns(refund_status);
CREATE INDEX idx_purchase_return_items_return_id ON purchase_return_items(purchase_return_id);
CREATE INDEX idx_purchase_return_items_product_id ON purchase_return_items(product_id);