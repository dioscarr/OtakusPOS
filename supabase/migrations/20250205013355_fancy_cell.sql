/*
  # Add user_id and RLS policies for shifts table

  1. Changes
    - Add user_id column with UUID type
    - Set default user_id for existing records
    - Update RLS policies
  
  2. Security
    - Enable RLS
    - Grant appropriate permissions
*/

-- First add the column as nullable
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Update existing records with a default user ID
-- We'll use the first employee's ID as a fallback
UPDATE shifts 
SET user_id = (
  SELECT id 
  FROM employees 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Now make it not null after populating
ALTER TABLE shifts 
ALTER COLUMN user_id SET NOT NULL;

-- Set the default for new records
ALTER TABLE shifts 
ALTER COLUMN user_id 
SET DEFAULT auth.uid();

-- Drop existing policies first
DROP POLICY IF EXISTS "shifts_select_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_select" ON shifts;
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_update" ON shifts;
DROP POLICY IF EXISTS "shifts_delete" ON shifts;

-- Create new policies
CREATE POLICY "shifts_select_policy"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "shifts_insert_policy"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shifts_update_policy"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shifts_delete_policy"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON shifts TO public;
GRANT ALL ON shifts TO authenticated;