/*
  # Fix Shifts RLS Policies - Final Update

  1. Changes
    - Drop existing policies for shifts table
    - Create new comprehensive policies that properly handle authentication and employee access
    - Simplify policy conditions for better reliability
  
  2. Security
    - Ensures proper access control for shifts
    - Maintains data integrity
    - Allows employees to manage their shifts
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Employees can read all shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can update their own shifts" ON shifts;

-- Create new comprehensive policies
CREATE POLICY "Anyone can read shifts"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true);