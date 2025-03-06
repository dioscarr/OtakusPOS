/*
  # Add Nelson Vasquez employee

  1. Changes
    - Insert new employee record for Nelson Vasquez
    - Handle conflict with existing code
*/

INSERT INTO employees (name, code)
VALUES ('Nelson Vasquez', '9999')
ON CONFLICT (code) 
DO UPDATE SET name = 'Nelson Vasquez'
WHERE employees.code = '9999';