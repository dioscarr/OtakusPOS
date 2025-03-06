-- Get employee ID for Luffy
WITH emp AS (
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
  employee_id,
  food_ready
)
SELECT
  'Monkey D. Luffy',
  5,
  'pending',
  150.00,
  27.00,
  15.00,
  192.00,
  true,
  'B0100000123',
  null,
  id,
  false
FROM emp
RETURNING id;

-- Insert order items
WITH latest_order AS (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
),
menu_items_sample AS (
  SELECT id, price 
  FROM menu_items 
  WHERE name IN ('Saitama Gyoza', 'Modelo Rubia', 'Luffy')
)
INSERT INTO order_items (
  order_id,
  menu_item_id,
  quantity,
  price
)
SELECT 
  (SELECT id FROM latest_order),
  menu_items_sample.id,
  CASE 
    WHEN menu_items_sample.price < 10 THEN 2
    ELSE 1
  END as quantity,
  menu_items_sample.price
FROM menu_items_sample;