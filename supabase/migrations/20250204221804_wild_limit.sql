/*
  # Final Shifts Table Fix

  1. Changes
    - Verify shifts table structure
    - Reset and recreate all shift policies
    - Add proper indexes
    - Add proper constraints
  
  2. Security
    - Ensure proper RLS policies
    - Verify employee relationship
*/

-- Verify shifts table structure
DO $$ 
BEGIN
  -- Add any missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE shifts ADD COLUMN employee_id uuid REFERENCES employees(id);
  END IF;
END $$;

-- Add index for employee_id if not exists
CREATE INDEX IF NOT EXISTS shifts_employee_id_idx ON shifts(employee_id);

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can read shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can update shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Anyone can read shifts"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Employees can insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  );

CREATE POLICY "Employees can update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  );

-- Verify constraints
DO $$ 
BEGIN
  -- Add status constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'shifts_status_check'
  ) THEN
    ALTER TABLE shifts ADD CONSTRAINT shifts_status_check 
      CHECK (status IN ('active', 'closed'));
  END IF;

  -- Add not null constraints
  ALTER TABLE shifts ALTER COLUMN employee_id SET NOT NULL;
  ALTER TABLE shifts ALTER COLUMN status SET NOT NULL;
  ALTER TABLE shifts ALTER COLUMN total_sales SET NOT NULL;
  ALTER TABLE shifts ALTER COLUMN total_orders SET NOT NULL;
END $$;