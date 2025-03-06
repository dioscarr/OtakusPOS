-- Make user_id column nullable
ALTER TABLE shifts 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop default value since we're not using it
ALTER TABLE shifts 
ALTER COLUMN user_id DROP DEFAULT;

-- First, disable RLS temporarily to ensure clean state
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

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