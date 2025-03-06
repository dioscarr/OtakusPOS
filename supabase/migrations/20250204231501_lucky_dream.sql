/*
  # Fix RLS policies for shifts table

  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow authenticated users full access
    - Ensure proper cash drawer operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON shifts;

-- Create new simplified policies
CREATE POLICY "shifts_select_policy"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "shifts_insert_policy"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "shifts_update_policy"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shifts_delete_policy"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;