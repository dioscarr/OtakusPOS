/*
  # Add new employee

  1. Changes
    - Insert new employee record
    - Handle conflict with existing code
*/

INSERT INTO employees (name, code)
VALUES ('John Smith', '1111')
ON CONFLICT (code) 
DO UPDATE SET name = 'John Smith'
WHERE employees.code = '1111';