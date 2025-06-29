/*
  # Add notes column to suppliers table

  1. Changes
    - Add notes column to suppliers table for storing additional information
*/

ALTER TABLE suppliers
ADD COLUMN notes text;