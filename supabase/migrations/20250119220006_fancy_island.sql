/*
  # Customer Payment Management System

  1. New Tables
    - `customer_accounts`: Tracks customer balances and financial status
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `current_balance` (decimal)
      - `last_payment_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `customer_payments`: Records all payment transactions
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `sale_id` (uuid, references sales, nullable)
      - `amount` (decimal)
      - `payment_date` (date)
      - `payment_method` (text)
      - `reference_number` (text)
      - `notes` (text)
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add payment_status to sales table
    - Add payment_amount to sales table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create customer_accounts table
CREATE TABLE customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  current_balance decimal NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  last_payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_payments table
CREATE TABLE customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  amount decimal NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL CHECK (payment_date <= CURRENT_DATE),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card')),
  reference_number text,
  notes text,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add payment fields to sales table
ALTER TABLE sales
ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_payment' 
  CHECK (payment_status IN ('pending_payment', 'partially_paid', 'paid')),
ADD COLUMN payment_amount decimal NOT NULL DEFAULT 0 CHECK (payment_amount >= 0);

-- Create function to update customer account balance
CREATE OR REPLACE FUNCTION update_customer_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Create account if it doesn't exist
  INSERT INTO customer_accounts (customer_id)
  VALUES (NEW.customer_id)
  ON CONFLICT (customer_id) DO NOTHING;

  -- Update balance and last payment date
  UPDATE customer_accounts
  SET 
    current_balance = current_balance + NEW.amount,
    last_payment_date = NEW.payment_date,
    updated_at = now()
  WHERE customer_id = NEW.customer_id;

  -- If payment is linked to a sale, update sale payment status
  IF NEW.sale_id IS NOT NULL THEN
    UPDATE sales
    SET 
      payment_amount = payment_amount + NEW.amount,
      payment_status = CASE
        WHEN payment_amount + NEW.amount >= total_amount THEN 'paid'
        ELSE 'partially_paid'
      END
    WHERE id = NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
CREATE TRIGGER update_balance_on_payment
  AFTER INSERT ON customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_account_balance();

-- Enable RLS
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_accounts
CREATE POLICY "All authenticated users can view customer accounts"
  ON customer_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customer accounts"
  ON customer_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer accounts"
  ON customer_accounts FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for customer_payments
CREATE POLICY "All authenticated users can view customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_customer_payments_sale_id ON customer_payments(sale_id);
CREATE INDEX idx_customer_payments_payment_date ON customer_payments(payment_date);