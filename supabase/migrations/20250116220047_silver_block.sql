/*
  # Add Exchange Rates Table

  1. New Tables
    - `exchange_rates`
      - `id` (uuid, primary key)
      - `rate` (decimal, not null)
      - `created_at` (timestamptz)
      - `is_default` (boolean)
      - `created_by` (uuid, references users)

  2. Security
    - Enable RLS on `exchange_rates` table
    - Add policies for viewing and managing exchange rates
*/

-- Create exchange rates table
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate decimal NOT NULL CHECK (rate > 0),
  created_at timestamptz DEFAULT now(),
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage exchange rates"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (true);

-- Insert initial exchange rate
INSERT INTO exchange_rates (rate, is_default, created_at)
VALUES (13000, true, now());