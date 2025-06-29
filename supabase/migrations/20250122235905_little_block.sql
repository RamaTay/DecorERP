/*
  # Add Currency Support
  
  1. Changes
    - Add currency fields to sales, purchases, and expenses
    - Add exchange rate fields to track transaction-specific rates
    - Add trigger to use default rate when specific rate is not provided
  
  2. New Fields
    - currency: The currency used for the transaction (USD/SYP)
    - exchange_rate: The specific exchange rate used for this transaction
*/

-- Add currency fields to sales
ALTER TABLE sales
ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
ADD COLUMN exchange_rate decimal;

-- Add currency fields to purchases
ALTER TABLE purchase_invoices
ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
ADD COLUMN exchange_rate decimal;

-- Add currency fields to expenses
ALTER TABLE expenses
ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
ADD COLUMN exchange_rate decimal;

-- Function to get exchange rate for date
CREATE OR REPLACE FUNCTION get_exchange_rate_for_date(transaction_date date)
RETURNS decimal AS $$
BEGIN
  RETURN (
    SELECT rate
    FROM exchange_rates
    WHERE created_at::date <= transaction_date
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle default exchange rates for sales
CREATE OR REPLACE FUNCTION set_default_sale_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if it's not provided and currency is SYP
  IF NEW.currency = 'SYP' AND NEW.exchange_rate IS NULL THEN
    NEW.exchange_rate := get_exchange_rate_for_date(NEW.sale_date::date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle default exchange rates for purchases
CREATE OR REPLACE FUNCTION set_default_purchase_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if it's not provided and currency is SYP
  IF NEW.currency = 'SYP' AND NEW.exchange_rate IS NULL THEN
    NEW.exchange_rate := get_exchange_rate_for_date(NEW.date::date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle default exchange rates for expenses
CREATE OR REPLACE FUNCTION set_default_expense_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if it's not provided and currency is SYP
  IF NEW.currency = 'SYP' AND NEW.exchange_rate IS NULL THEN
    NEW.exchange_rate := get_exchange_rate_for_date(NEW.date::date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_sale_exchange_rate
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_default_sale_exchange_rate();

CREATE TRIGGER set_purchase_exchange_rate
  BEFORE INSERT OR UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_default_purchase_exchange_rate();

CREATE TRIGGER set_expense_exchange_rate
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_default_expense_exchange_rate();