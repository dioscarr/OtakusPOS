-- Add Luffy employee
INSERT INTO employees (name, code)
VALUES ('Luffy', '4530')
ON CONFLICT (code) 
DO UPDATE SET name = 'Luffy'
WHERE employees.code = '4530';