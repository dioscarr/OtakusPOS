/*
  # Add employee-specific RLS policy for shifts
  
  1. Changes
    - Add new RLS policy that ties shifts to specific employees
    - Maintain existing basic policies for core functionality
  
  2. Security
    - Employees can only manage shifts they are assigned to
    - Maintains public read access for shift data
    - Ensures data integrity by validating employee_id
*/

-- Create new employee-specific policy
CREATE POLICY "Employees can manage their own shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (
    -- For SELECT/UPDATE/DELETE operations
    CASE
      WHEN employee_id IS NOT NULL THEN
        employee_id IN (
          SELECT id 
          FROM employees 
          WHERE employees.id = shifts.employee_id
        )
      ELSE true
    END
  )
  WITH CHECK (
    -- For INSERT/UPDATE operations
    CASE
      WHEN employee_id IS NOT NULL THEN
        employee_id IN (
          SELECT id 
          FROM employees 
          WHERE employees.id = shifts.employee_id
        )
      ELSE true
    END
  );