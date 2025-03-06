/*
  # Drop All Shift Policies

  1. Changes
    - Drop all existing policies from the shifts table
    - Keep RLS enabled
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Anyone can read shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON shifts;
DROP POLICY IF EXISTS "Public read access for shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated users can manage shifts" ON shifts;
DROP POLICY IF EXISTS "Enable read access for all users" ON shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Employees can manage their own shifts" ON shifts;
DROP POLICY IF EXISTS "Public read access" ON shifts;
DROP POLICY IF EXISTS "Insert access for authenticated" ON shifts;
DROP POLICY IF EXISTS "Update access for authenticated" ON shifts;
DROP POLICY IF EXISTS "Authenticated can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Authenticated can update shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can insert shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to read shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update their shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can read all shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can insert their own shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can update their own shifts" ON shifts;

-- Ensure RLS stays enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;