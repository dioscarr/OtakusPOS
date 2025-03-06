/*
  # Add user_id to shifts table and update RLS policies

  1. Changes
    - Add user_id column to shifts table with default value
    - Update RLS policies to use auth.uid()
  
  2. Security
    - Enable RLS
    - Restrict operations to authenticated users with matching user_id
*/

-- Add user_id column with a default value from auth.uid()
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Drop existing policies
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

-- Create new policies using auth.uid()
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