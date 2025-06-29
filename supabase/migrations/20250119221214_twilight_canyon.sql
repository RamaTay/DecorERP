/*
  # Add price list functionality to customers and sales

  1. New Columns
    - Add default_price_list_id to customers table
    - Add price_list_id to sales table
    - Add appropriate foreign key constraints and indexes

  2. Changes
    - Add foreign key constraints to link customers and sales to price lists
    - Add indexes for performance optimization
*/

-- Add default price list to customers
ALTER TABLE customers
ADD COLUMN default_price_list_id uuid REFERENCES price_lists(id);

-- Add price list to sales
ALTER TABLE sales
ADD COLUMN price_list_id uuid REFERENCES price_lists(id);

-- Create indexes for performance
CREATE INDEX idx_customers_default_price_list ON customers(default_price_list_id);
CREATE INDEX idx_sales_price_list ON sales(price_list_id);