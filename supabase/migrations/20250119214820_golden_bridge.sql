/*
  # Add sale date to sales table

  1. Changes
    - Add sale_date column to sales table
    - Set default value to current date
    - Add constraint to prevent future dates
    - Backfill existing records
*/

-- Add sale_date column
ALTER TABLE sales
ADD COLUMN sale_date date NOT NULL DEFAULT CURRENT_DATE;

-- Add constraint to prevent future dates
ALTER TABLE sales
ADD CONSTRAINT sale_date_not_future CHECK (sale_date <= CURRENT_DATE);

-- Backfill existing records with their created_at date
UPDATE sales
SET sale_date = DATE(created_at)
WHERE sale_date = CURRENT_DATE;