/*
  # Add comprehensive sample data

  This migration adds sample data for testing all features of the POS system.

  1. Data Overview
    - Employees with different shifts
    - Menu items across all categories
    - Orders in different states (pending, paid)
    - Order items with various quantities
    - Shift records with cash drawer tracking
    - Cash movements for sales and adjustments

  2. Relationships
    - Orders linked to employees and shifts
    - Order items linked to orders and menu items
    - Shifts linked to employees
    - Cash movements linked to shifts
*/

-- First, ensure we have our test employees
INSERT INTO employees (name, code, shift_status, cash_in_drawer, total_sales, total_orders)
VALUES 
  ('John Smith', '1234', 'active', 1000.00, 2500.00, 15),
  ('Maria Garcia', '5678', 'inactive', 0.00, 1800.00, 10),
  ('David Wilson', '9012', 'active', 750.00, 1200.00, 8)
ON CONFLICT (code) 
DO UPDATE SET 
  name = EXCLUDED.name,
  shift_status = EXCLUDED.shift_status,
  cash_in_drawer = EXCLUDED.cash_in_drawer,
  total_sales = EXCLUDED.total_sales,
  total_orders = EXCLUDED.total_orders;

-- Create active shifts for employees
WITH emp AS (
  SELECT id, name FROM employees WHERE shift_status = 'active'
)
INSERT INTO shifts (
  employee_id,
  start_time,
  status,
  total_sales,
  total_orders,
  cash_in_drawer
)
SELECT 
  id,
  NOW() - interval '4 hours',
  'active',
  CASE name
    WHEN 'John Smith' THEN 2500.00
    ELSE 1200.00
  END,
  CASE name
    WHEN 'John Smith' THEN 15
    ELSE 8
  END,
  CASE name
    WHEN 'John Smith' THEN 1000.00
    ELSE 750.00
  END
FROM emp
ON CONFLICT DO NOTHING;

-- Create some completed shifts
WITH emp AS (
  SELECT id FROM employees LIMIT 1
)
INSERT INTO shifts (
  employee_id,
  start_time,
  end_time,
  status,
  total_sales,
  total_orders,
  cash_in_drawer
)
SELECT 
  id,
  NOW() - interval '1 day',
  NOW() - interval '16 hours',
  'closed',
  1800.00,
  12,
  0.00
FROM emp
ON CONFLICT DO NOTHING;

-- Create sample orders
WITH emp AS (
  SELECT id FROM employees WHERE name = 'John Smith' LIMIT 1
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
  food_ready,
  created_at
)
SELECT
  name,
  table_number,
  status,
  subtotal,
  itbis,
  tip,
  total,
  is_fiscal,
  fiscal_number,
  payment_method,
  emp.id,
  food_ready,
  created_at
FROM emp,
(VALUES 
  (
    'Carlos Rodriguez',
    1,
    'paid',
    100.00,
    18.00,
    10.00,
    128.00,
    true,
    'B0100000001',
    'cash',
    true,
    NOW() - interval '3 hours'
  ),
  (
    'Maria Santos',
    2,
    'pending',
    85.00,
    15.30,
    8.50,
    108.80,
    false,
    null,
    null,
    false,
    NOW() - interval '30 minutes'
  ),
  (
    'Juan Perez',
    3,
    'paid',
    150.00,
    27.00,
    15.00,
    192.00,
    true,
    'B0100000002',
    'card',
    true,
    NOW() - interval '2 hours'
  ),
  (
    'Ana Martinez',
    4,
    'pending',
    95.00,
    17.10,
    9.50,
    121.60,
    false,
    null,
    null,
    false,
    NOW() - interval '15 minutes'
  )
) AS orders(
  name,
  table_number,
  status,
  subtotal,
  itbis,
  tip,
  total,
  is_fiscal,
  fiscal_number,
  payment_method,
  food_ready,
  created_at
)
RETURNING id;

-- Add order items
WITH latest_orders AS (
  SELECT id, created_at 
  FROM orders 
  ORDER BY created_at DESC 
  LIMIT 4
),
menu_items_sample AS (
  SELECT id, price, category
  FROM menu_items
  WHERE category IN ('Food', 'Cocktails', 'Beer')
  LIMIT 10
)
INSERT INTO order_items (
  order_id,
  menu_item_id,
  quantity,
  price
)
SELECT 
  o.id,
  m.id,
  CASE 
    WHEN m.category = 'Food' THEN 2
    ELSE 1
  END as quantity,
  m.price
FROM latest_orders o
CROSS JOIN menu_items_sample m;

-- Add cash movements for the day
WITH active_shifts AS (
  SELECT id, employee_id
  FROM shifts
  WHERE status = 'active'
  LIMIT 1
)
INSERT INTO cash_movements (
  shift_id,
  employee_id,
  amount,
  type,
  description,
  created_at
)
SELECT 
  s.id,
  s.employee_id,
  amount,
  type,
  description,
  created_at
FROM active_shifts s,
(VALUES 
  (128.00, 'sale', 'Order #1', NOW() - interval '3 hours'),
  (192.00, 'sale', 'Order #2', NOW() - interval '2 hours'),
  (-50.00, 'withdrawal', 'Change request', NOW() - interval '1 hour'),
  (108.80, 'sale', 'Order #3', NOW() - interval '30 minutes')
) as movements(amount, type, description, created_at);