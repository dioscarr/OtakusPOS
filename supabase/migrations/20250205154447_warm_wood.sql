-- First, disable RLS temporarily to ensure clean state
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "shifts_select_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON shifts;
DROP POLICY IF EXISTS "Public read access" ON shifts;
DROP POLICY IF EXISTS "Authenticated can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can update shifts" ON shifts;

-- Create new simplified policies
CREATE POLICY "shifts_select"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "shifts_insert"
  ON shifts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "shifts_update"
  ON shifts
  FOR UPDATE
  USING (true);

CREATE POLICY "shifts_delete"
  ON shifts
  FOR DELETE
  USING (true);

-- Re-enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON shifts TO public;