/*
  # Fix shifts table RLS policies

  1. Changes
    - Drop existing policies
    - Create new comprehensive policies for shifts table
    - Grant proper permissions
    - Add proper RLS policies for all operations
  
  2. Security
    - Enable RLS
    - Allow public read access
    - Allow authenticated users to manage shifts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

-- Create new policies with proper checks
CREATE POLICY "shifts_select"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "shifts_insert"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    employee_id IN (
      SELECT id FROM employees
    )
  );

CREATE POLICY "shifts_update"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    employee_id IN (
      SELECT id FROM employees
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    employee_id IN (
      SELECT id FROM employees
    )
  );

CREATE POLICY "shifts_delete"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    employee_id IN (
      SELECT id FROM employees
    )
  );

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON shifts TO public;
GRANT ALL ON shifts TO authenticated;