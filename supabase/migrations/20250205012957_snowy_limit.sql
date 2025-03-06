/*
  # Simplify RLS policies for shifts table

  1. Changes
    - Drop existing complex policies
    - Create simpler policies that work with auth
    - Ensure proper permissions
  
  2. Security
    - Maintain RLS
    - Allow authenticated users to manage shifts
    - Allow public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

-- Create simplified policies
CREATE POLICY "shifts_select_policy"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "shifts_insert_policy"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "shifts_update_policy"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "shifts_delete_policy"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON shifts TO public;
GRANT ALL ON shifts TO authenticated;