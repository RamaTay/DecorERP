/*
  # Fix RLS policies for customer payments

  1. Changes
    - Drop existing policies
    - Recreate policies with proper user authentication checks
    - Add policies for:
      - Viewing payments (all authenticated users)
      - Creating payments (authenticated users)
      - Updating payments (payment creator only)
      - Deleting payments (payment creator only)

  2. Security
    - All authenticated users can view payments
    - Only authenticated users can create payments
    - Users can only modify their own payments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "All authenticated users can view customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON customer_payments;

-- Recreate RLS Policies for customer_payments
CREATE POLICY "All authenticated users can view customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND id = created_by
  ));

CREATE POLICY "Users can update their own payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND id = created_by
  ));

CREATE POLICY "Users can delete their own payments"
  ON customer_payments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND id = created_by
  ));