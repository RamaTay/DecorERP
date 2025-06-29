/*
  # Add transaction exchange rate support

  1. Changes
    - Add transaction_exchange_rate column to sales, purchases, and expenses tables
    - Add function to handle transaction-specific exchange rates
    - Add triggers to manage exchange rates

  2. Notes
    - transaction_exchange_rate takes precedence over the default exchange rate
    - If not set, falls back to the exchange rate from the date of the transaction
*/

-- Add transaction-specific exchange rate columns
ALTER TABLE sales
ADD COLUMN transaction_exchange_rate decimal;

ALTER TABLE purchase_invoices
ADD COLUMN transaction_exchange_rate decimal;

ALTER TABLE expenses
ADD COLUMN transaction_exchange_rate decimal;

-- Update functions to handle transaction-specific exchange rates
CREATE OR REPLACE FUNCTION set_default_sale_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if currency is SYP
  IF NEW.currency = 'SYP' THEN
    -- Use transaction-specific rate if provided, otherwise get historical rate
    IF NEW.transaction_exchange_rate IS NOT NULL THEN
      NEW.exchange_rate := NEW.transaction_exchange_rate;
    ELSE
      NEW.exchange_rate := get_exchange_rate_for_date(NEW.sale_date::date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_default_purchase_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if currency is SYP
  IF NEW.currency = 'SYP' THEN
    -- Use transaction-specific rate if provided, otherwise get historical rate
    IF NEW.transaction_exchange_rate IS NOT NULL THEN
      NEW.exchange_rate := NEW.transaction_exchange_rate;
    ELSE
      NEW.exchange_rate := get_exchange_rate_for_date(NEW.date::date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_default_expense_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set exchange rate if currency is SYP
  IF NEW.currency = 'SYP' THEN
    -- Use transaction-specific rate if provided, otherwise get historical rate
    IF NEW.transaction_exchange_rate IS NOT NULL THEN
      NEW.exchange_rate := NEW.transaction_exchange_rate;
    ELSE
      NEW.exchange_rate := get_exchange_rate_for_date(NEW.date::date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;