/*
  # Add purchase status tracking

  1. New Tables
    - `purchase_status_logs`
      - Tracks all status changes for purchase invoices
      - Records user, timestamp, and reason for changes

  2. Changes
    - Add cancellation_reason to purchase_invoices
    - Add payment_date to purchase_invoices
*/

-- Add cancellation reason and payment date to purchase_invoices
ALTER TABLE purchase_invoices
ADD COLUMN cancellation_reason text,
ADD COLUMN payment_date timestamptz;

-- Create status logs table
CREATE TABLE purchase_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid REFERENCES purchase_invoices(id) NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  old_status text NOT NULL,
  new_status text NOT NULL,
  old_payment_status text,
  new_payment_status text,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_status_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status logs
CREATE POLICY "All authenticated users can view status logs"
  ON purchase_status_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create status logs"
  ON purchase_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);