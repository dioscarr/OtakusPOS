/*
  # Fix shifts table RLS policies

  1. Changes
    - Drop existing RLS policies
    - Create simplified policies that allow:
      - Public read access
      - Authenticated users to perform all operations
    - Keep RLS enabled
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "shifts_select_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON shifts;

-- Create a single policy for all operations
CREATE POLICY "shifts_policy"
  ON shifts
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;