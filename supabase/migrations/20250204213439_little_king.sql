/*
  # Add TOP Admin employee

  1. Changes
    - Add TOP Admin employee with code 1234
*/

INSERT INTO employees (name, code)
VALUES ('TOP Admin', '1234')
ON CONFLICT (code) 
DO UPDATE SET name = 'TOP Admin'
WHERE employees.code = '1234';