/*
  # Fix Customer RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies for customer updates and deletes
    - Add new policies allowing all authenticated users to update and delete customers
    
  2. Security
    - Maintains authentication requirement
    - Allows all authenticated users to perform CRUD operations
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Managers and admins can update customers" ON customers;
DROP POLICY IF EXISTS "Managers and admins can delete customers" ON customers;

-- Create new policies for all authenticated users
CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);