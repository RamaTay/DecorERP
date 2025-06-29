/*
  # Update currency handling

  1. Changes
    - Ensure amount/total_amount always stores USD equivalent
    - syp_amount only used when currency is "SYP"
    - When currency is "USD", amount is used directly
    - When currency is "SYP", amount is calculated from syp_amount divided by exchange rate

  2. Notes
    - No data loss - existing records are preserved
    - Maintains data consistency with new rules
*/

-- Update trigger functions to handle currency conversion correctly
CREATE OR REPLACE FUNCTION set_default_expense_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
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
  ELSE
    -- For USD transactions, amount is used directly
    NEW.syp_amount := NULL;
    NEW.exchange_rate := NULL;
    NEW.transaction_exchange_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_default_sale_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
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
  ELSE
    -- For USD transactions, total_amount is used directly
    NEW.syp_amount := NULL;
    NEW.exchange_rate := NULL;
    NEW.transaction_exchange_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_default_purchase_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
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
  ELSE
    -- For USD transactions, total_amount is used directly
    NEW.syp_amount := NULL;
    NEW.exchange_rate := NULL;
    NEW.transaction_exchange_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;