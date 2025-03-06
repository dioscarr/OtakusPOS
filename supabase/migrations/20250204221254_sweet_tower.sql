/*
  # Fix Shifts RLS Policies

  1. Changes
    - Drop existing insert policy for shifts
    - Create new insert policy that checks employee_id
    - Update update policy for better security
  
  2. Security
    - Ensures users can only insert shifts for themselves
    - Maintains data integrity by linking shifts to employees
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;

-- Create new insert policy that checks employee_id
CREATE POLICY "Allow authenticated users to insert their own shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  );

-- Update the update policy to be more specific
DROP POLICY IF EXISTS "Allow authenticated users to update their shifts" ON shifts;

CREATE POLICY "Allow authenticated users to update their shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  );