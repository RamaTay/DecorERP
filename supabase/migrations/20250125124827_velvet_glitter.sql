/*
  # Fix RLS policies for customer payments

  1. Changes
    - Drop existing policies
    - Create new policy for viewing payments
    - Create new policy for creating payments
    - Create new policy for updating payments
    - Create new policy for deleting payments

  2. Security
    - All authenticated users can view payments
    - Only authenticated users with valid user records can create/modify payments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "All authenticated users can view customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON customer_payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON customer_payments;

-- Create new policies with proper user validation
CREATE POLICY "View customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Update own customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND
            users.id = created_by
    )
  );

CREATE POLICY "Delete own customer payments"
  ON customer_payments FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND
            users.id = created_by
    )
  );