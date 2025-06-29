/*
  # Update amount columns for currency handling

  1. Changes
    - Rename original_amount to syp_amount for clarity
    - Update trigger functions to handle SYP amounts correctly
    - Add comments explaining the amount fields

  2. Notes
    - amount: Always stores the USD equivalent
    - syp_amount: Only used when currency is "SYP"
    - When currency is "USD", amount is used directly
    - When currency is "SYP", amount is calculated from syp_amount
*/

-- Rename original_amount to syp_amount for clarity
ALTER TABLE expenses
RENAME COLUMN original_amount TO syp_amount;

ALTER TABLE sales
RENAME COLUMN original_amount TO syp_amount;

ALTER TABLE purchase_invoices
RENAME COLUMN original_amount TO syp_amount;

-- Update trigger functions to use new terminology
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
    
    -- Calculate USD amount from SYP amount
    IF NEW.syp_amount IS NOT NULL THEN
      NEW.amount := NEW.syp_amount / NEW.exchange_rate;
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
    
    -- Calculate USD amount from SYP amount
    IF NEW.syp_amount IS NOT NULL THEN
      NEW.total_amount := NEW.syp_amount / NEW.exchange_rate;
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
    
    -- Calculate USD amount from SYP amount
    IF NEW.syp_amount IS NOT NULL THEN
      NEW.total_amount := NEW.syp_amount / NEW.exchange_rate;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN expenses.amount IS 'Always stores the USD equivalent amount';
COMMENT ON COLUMN expenses.syp_amount IS 'Stores the original SYP amount when currency is SYP';
COMMENT ON COLUMN expenses.currency IS 'Transaction currency (USD or SYP)';
COMMENT ON COLUMN expenses.exchange_rate IS 'Exchange rate used for conversion when currency is SYP';

COMMENT ON COLUMN sales.total_amount IS 'Always stores the USD equivalent amount';
COMMENT ON COLUMN sales.syp_amount IS 'Stores the original SYP amount when currency is SYP';
COMMENT ON COLUMN sales.currency IS 'Transaction currency (USD or SYP)';
COMMENT ON COLUMN sales.exchange_rate IS 'Exchange rate used for conversion when currency is SYP';

COMMENT ON COLUMN purchase_invoices.total_amount IS 'Always stores the USD equivalent amount';
COMMENT ON COLUMN purchase_invoices.syp_amount IS 'Stores the original SYP amount when currency is SYP';
COMMENT ON COLUMN purchase_invoices.currency IS 'Transaction currency (USD or SYP)';
COMMENT ON COLUMN purchase_invoices.exchange_rate IS 'Exchange rate used for conversion when currency is SYP';