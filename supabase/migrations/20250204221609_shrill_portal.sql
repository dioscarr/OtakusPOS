/*
  # Fix Shifts RLS Policies - Final Update

  1. Changes
    - Drop existing policies for shifts table
    - Create new comprehensive policies that properly handle employee relationships
    - Add proper checks for employee_id
    - Enable public access for read operations
  
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
  USING (true);

CREATE POLICY "Authenticated can insert shifts"
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

CREATE POLICY "Authenticated can update shifts"
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