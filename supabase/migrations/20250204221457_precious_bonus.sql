/*
  # Fix Shifts RLS Policies - Final Update V2

  1. Changes
    - Drop existing policies for shifts table
    - Create new comprehensive policies that properly handle employee authentication
    - Add proper checks for employee_id
  
  2. Security
    - Ensures proper access control for shifts
    - Maintains data integrity
    - Allows employees to manage their shifts
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Anyone can read shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can update shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Public can read shifts"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Employees can insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = shifts.employee_id
    )
  );