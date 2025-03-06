-- Add active_tabs column to employees table
ALTER TABLE employees
ADD COLUMN active_tabs jsonb DEFAULT '[]'::jsonb;

-- Create index for faster JSON operations
CREATE INDEX employees_active_tabs_gin_idx ON employees USING GIN (active_tabs);

-- Create function to update active tabs
CREATE OR REPLACE FUNCTION update_employee_active_tabs()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    -- Add new tab to employee's active tabs
    UPDATE employees
    SET active_tabs = active_tabs || jsonb_build_object(
      'id', NEW.id,
      'customerName', NEW.customer_name,
      'tableNumber', NEW.table_number,
      'total', NEW.total
    )
    WHERE id = NEW.employee_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status = 'open' THEN
    -- Remove closed tab from employee's active tabs
    UPDATE employees
    SET active_tabs = active_tabs - (
      SELECT ordinality - 1
      FROM jsonb_array_elements(active_tabs) WITH ORDINALITY
      WHERE value->>'id' = NEW.id::text
    )
    WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tabs table
CREATE TRIGGER update_employee_active_tabs_trigger
AFTER INSERT OR UPDATE ON tabs
FOR EACH ROW
EXECUTE FUNCTION update_employee_active_tabs();

-- Create function to get employee's active tabs
CREATE OR REPLACE FUNCTION get_employee_active_tabs(employee_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT active_tabs
  FROM employees
  WHERE id = employee_id;
$$;