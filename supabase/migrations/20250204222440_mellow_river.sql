/*
  # Final fix for shifts table RLS policies
  
  1. Changes
    - Drop all existing RLS policies for shifts table
    - Create new simplified but secure policies
    - Enable basic operations for authenticated users
  
  2. Security
    - Allow anyone to read shifts (needed for displaying shift information)
    - Allow authenticated users to insert and update shifts
    - Maintain basic security through authentication
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Anyone can read shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can update shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Public read access"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Insert access for authenticated"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update access for authenticated"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true);