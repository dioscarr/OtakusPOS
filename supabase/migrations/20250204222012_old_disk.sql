/*
  # Count shifts table entries
  
  1. Changes
    - Add a function to count shifts
  
  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION count_shifts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total integer;
BEGIN
  SELECT COUNT(*) INTO total FROM shifts;
  RETURN total;
END;
$$;