/*
  # Fix shifts table RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create separate policies for each operation type
    - Ensure proper authentication checks
    - Allow proper access to shifts table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "shifts_policy" ON shifts;

-- Create separate policies for each operation
CREATE POLICY "shifts_select"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "shifts_insert"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "shifts_update"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shifts_delete"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON shifts TO public;
GRANT ALL ON shifts TO authenticated;