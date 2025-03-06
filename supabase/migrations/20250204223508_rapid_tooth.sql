/*
  # Disable All Shift Policies

  1. Changes
    - Disable RLS on the shifts table
*/

-- Disable RLS on shifts table
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;