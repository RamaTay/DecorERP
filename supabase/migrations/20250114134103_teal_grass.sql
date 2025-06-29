/*
  # Add user creation policy
  
  1. Changes
    - Add policy to allow users to create their own record
    - Add policy to allow users to update their own record
  
  2. Security
    - Users can only create/update their own record
    - Maintains existing admin policies
*/

-- Allow users to create their own record
CREATE POLICY "Users can create their own record"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own record
CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  USING (auth.uid() = id);