/*
  # Update Expenses RLS Policies

  1. Changes
    - Add policy for authenticated users to create expenses
    - Add policy for users to update their own expenses
    - Add policy for users to delete their own expenses

  2. Security
    - Ensures users can only manage their own expenses
    - Maintains existing read access for all authenticated users
*/

-- Drop existing policies for expenses
DROP POLICY IF EXISTS "All authenticated users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Managers and admins can manage expenses" ON expenses;

-- Create new policies
CREATE POLICY "All authenticated users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);