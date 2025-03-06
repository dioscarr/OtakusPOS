-- Drop tab-related tables
DROP TABLE IF EXISTS tab_items;
DROP TABLE IF EXISTS tabs;

-- Drop tab-related functions
DROP FUNCTION IF EXISTS update_employee_active_tabs();
DROP FUNCTION IF EXISTS get_employee_active_tabs(uuid);

-- Remove active_tabs column from employees
ALTER TABLE employees DROP COLUMN IF EXISTS active_tabs;
DROP INDEX IF EXISTS employees_active_tabs_gin_idx;