/*
  # Add currency support to customer payments

  1. New Fields
    - Add currency fields to customer_payments table:
      - currency (USD/SYP)
      - syp_amount (original SYP amount)
      - transaction_exchange_rate (specific rate used for this payment)
      - exchange_rate (historical rate from exchange_rates table)

  2. Changes
    - Add currency fields to track both USD and SYP payments
    - Store original SYP amount when payment is made in SYP
    - Track exchange rates used for conversion
*/

-- Add currency fields to customer_payments
ALTER TABLE customer_payments
ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'SYP')),
ADD COLUMN syp_amount decimal,
ADD COLUMN transaction_exchange_rate decimal,
ADD COLUMN exchange_rate decimal;

-- Function to handle default exchange rates for payments
CREATE OR REPLACE FUNCTION set_default_payment_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency = 'SYP' THEN
    -- Use transaction-specific rate if provided, otherwise get historical rate
    IF NEW.transaction_exchange_rate IS NOT NULL THEN
      NEW.exchange_rate := NEW.transaction_exchange_rate;
    ELSE
      NEW.exchange_rate := get_exchange_rate_for_date(NEW.payment_date::date);
    END IF;
    
    -- Calculate USD amount from SYP amount
    IF NEW.syp_amount IS NOT NULL THEN
      NEW.amount := NEW.syp_amount / NEW.exchange_rate;
    END IF;
  ELSE
    -- For USD payments, clear SYP-related fields
    NEW.syp_amount := NULL;
    NEW.exchange_rate := NULL;
    NEW.transaction_exchange_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment currency handling
CREATE TRIGGER set_payment_exchange_rate
  BEFORE INSERT OR UPDATE ON customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_default_payment_exchange_rate();

-- Add comments for clarity
COMMENT ON COLUMN customer_payments.amount IS 'Always stores the USD equivalent amount';
COMMENT ON COLUMN customer_payments.syp_amount IS 'Stores the original SYP amount when currency is SYP';
COMMENT ON COLUMN customer_payments.currency IS 'Payment currency (USD or SYP)';
COMMENT ON COLUMN customer_payments.exchange_rate IS 'Exchange rate used for conversion when currency is SYP';