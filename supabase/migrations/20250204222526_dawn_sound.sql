/*
  # Final fix for shifts table RLS policies
  
  1. Changes
    - Drop existing RLS policies for shifts table
    - Create new simplified policies that work with our auth flow
    - Enable all basic operations for authenticated users
  
  2. Security
    - Allow public read access (needed for displaying shift information)
    - Allow authenticated users to insert and update shifts
    - Remove complex conditions that were causing issues
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public read access" ON shifts;
DROP POLICY IF EXISTS "Insert access for authenticated" ON shifts;
DROP POLICY IF EXISTS "Update access for authenticated" ON shifts;

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Verify RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;