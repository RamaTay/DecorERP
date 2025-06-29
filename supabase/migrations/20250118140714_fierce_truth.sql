/*
  # Fix purchase status logs structure

  1. Changes
    - Make status fields nullable in purchase_status_logs
    - Add check constraint to ensure at least one status change is recorded
*/

-- Make status fields nullable but add constraint to ensure at least one type of status change
ALTER TABLE purchase_status_logs
ALTER COLUMN old_status DROP NOT NULL,
ALTER COLUMN new_status DROP NOT NULL;

-- Add constraint to ensure at least one type of status change is recorded
ALTER TABLE purchase_status_logs
ADD CONSTRAINT ensure_status_change 
CHECK (
  (old_status IS NOT NULL AND new_status IS NOT NULL) OR 
  (old_payment_status IS NOT NULL AND new_payment_status IS NOT NULL)
);