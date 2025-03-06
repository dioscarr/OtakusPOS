/*
  # Add default employee with code '0000'

  1. Changes
    - Add default employee with code '0000'
    - Update employee code column to be case-sensitive
    - Add index on employee code for faster lookups

  2. Security
    - No changes to existing RLS policies
*/

-- Make sure the code column is case-sensitive
ALTER TABLE employees
ALTER COLUMN code TYPE text COLLATE "C";

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS employees_code_idx ON employees (code);

-- Add default employee with code '0000'
INSERT INTO employees (name, code)
VALUES ('Default Admin', '0000')
ON CONFLICT (code) 
DO UPDATE SET name = 'Default Admin'
WHERE employees.code = '0000';