/*
  # Add sample order data

  1. New Data
    - Sample order for testing
    - Associated order items
    
  2. Details
    - Creates a complete order with multiple items
    - Uses existing menu items
    - Links to employee with code '4530' (Luffy)
*/

-- Insert sample order
WITH employee_id AS (
  SELECT id FROM employees WHERE code = '4530' LIMIT 1
)
INSERT INTO orders (
  customer_name,
  table_number,
  status,
  subtotal,
  itbis,
  tip,
  total,
  is_fiscal,
  fiscal_number,
  payment_method,
  employee_id
)
SELECT
  'John Doe',
  1,
  'paid',
  100.00,
  18.00,
  10.00,
  128.00,
  true,
  'B0100000005',
  'cash',
  id
FROM employee_id
RETURNING id;

-- Insert order items
WITH order_id AS (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
),
menu_items_sample AS (
  SELECT id, price 
  FROM menu_items 
  WHERE name IN ('Luffy', 'Saitama Gyoza', 'Modelo Rubia')
)
INSERT INTO order_items (
  order_id,
  menu_item_id,
  quantity,
  price
)
SELECT 
  (SELECT id FROM order_id),
  menu_items_sample.id,
  CASE 
    WHEN menu_items_sample.price < 10 THEN 2
    ELSE 1
  END as quantity,
  menu_items_sample.price
FROM menu_items_sample;

-- Update employee totals
WITH order_totals AS (
  SELECT 
    employee_id,
    COUNT(*) as order_count,
    SUM(total) as total_sales
  FROM orders
  GROUP BY employee_id
)
UPDATE employees
SET 
  total_orders = order_totals.order_count,
  total_sales = order_totals.total_sales
FROM order_totals
WHERE employees.id = order_totals.employee_id;