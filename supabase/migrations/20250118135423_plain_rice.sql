/*
  # Add status field to suppliers table

  1. Changes
    - Add status field to suppliers table with default value 'active'
    - Add check constraint for valid status values

  2. Notes
    - Status can be either 'active' or 'inactive'
    - Default value is 'active' for new suppliers
*/

ALTER TABLE suppliers
ADD COLUMN status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'inactive'));