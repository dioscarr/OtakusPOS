/*
  # Add shift management to employees table

  1. Changes
    - Add shift_status column to track if employee is on shift
    - Add cash_in_drawer column to track current cash amount
    - Add shift_start_time column to track when shift started
    - Add total_sales and total_orders columns for shift tracking
*/

-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS shift_status text CHECK (shift_status IN ('active', 'inactive')) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS cash_in_drawer decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_start_time timestamptz,
ADD COLUMN IF NOT EXISTS total_sales decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS employees_shift_status_idx ON employees(shift_status);

-- Drop existing policies if any
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;

-- Create policies for employee shift management
CREATE POLICY "employees_select"
  ON employees
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "employees_update"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);