/*
  # Fix Shifts RLS Policies

  1. Changes
    - Drop existing policies
    - Create new comprehensive policies for shifts table
    - Ensure proper access control for authenticated users

  2. Security
    - Enable RLS
    - Add policies for read, insert, and update operations
    - Allow authenticated users to manage shifts
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Public read access for shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can manage shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Anyone can read shifts"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated'
  );

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;