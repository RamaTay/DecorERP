/*
  # Fix Sale Date Constraint

  1. Changes
    - Drop existing constraint
    - Add new constraint with proper validation
*/

-- Drop existing constraint if it exists
ALTER TABLE sales
DROP CONSTRAINT IF EXISTS sale_date_not_future;

-- Add new constraint with proper validation
ALTER TABLE sales
ADD CONSTRAINT sale_date_not_future 
CHECK (sale_date <= CURRENT_DATE::date);