/*
  # Add original amount column for SYP transactions

  1. Changes
    - Add original_amount column to expenses table to store the original SYP amount
    - Add original_amount column to sales table for consistency
    - Add original_amount column to purchase_invoices table for consistency
    - Update triggers to handle original amount calculations

  2. Notes
    - The original_amount column will store the amount as entered in SYP
    - The amount column will continue to store the USD equivalent
    - This allows for accurate historical record keeping of the original entered amounts
*/

-- Add original_amount columns
ALTER TABLE expenses
ADD COLUMN original_amount decimal;

ALTER TABLE sales 
ADD COLUMN original_amount decimal;

ALTER TABLE purchase_invoices
ADD COLUMN original_amount decimal;

-- Update trigger functions to handle original amount
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
    
    -- Store original SYP amount and calculate USD amount
    IF NEW.original_amount IS NOT NULL THEN
      NEW.amount := NEW.original_amount / NEW.exchange_rate;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    
    -- Store original SYP amount and calculate USD amount
    IF NEW.original_amount IS NOT NULL THEN
      NEW.total_amount := NEW.original_amount / NEW.exchange_rate;
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
    
    -- Store original SYP amount and calculate USD amount
    IF NEW.original_amount IS NOT NULL THEN
      NEW.total_amount := NEW.original_amount / NEW.exchange_rate;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;