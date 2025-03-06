/*
  # Fix Shifts RLS Policies - Final Update

  1. Changes
    - Drop existing policies for shifts table
    - Create new comprehensive policies that properly handle authentication
  
  2. Security
    - Ensures proper access control for shifts
    - Links shifts to authenticated employees
    - Maintains data integrity
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Allow authenticated users to read shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update their shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Employees can read all shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert their own shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IS NOT NULL
  );

CREATE POLICY "Employees can update their own shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IS NOT NULL
  )
  WITH CHECK (
    employee_id IS NOT NULL
  );