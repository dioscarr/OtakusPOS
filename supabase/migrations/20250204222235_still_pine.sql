/*
  # Add sample data to all tables
  
  1. Changes
    - Add sample data to all tables
    - Ensure referential integrity
    - Use realistic values
  
  2. Tables
    - employees (already has data)
    - shifts
    - shift_registers
    - cash_movements
    - menu_items (already has data)
*/

-- Insert a sample shift
INSERT INTO shifts (
  employee_id,
  start_time,
  end_time,
  total_sales,
  total_orders,
  status
)
SELECT 
  id as employee_id,
  NOW() - interval '2 hours' as start_time,
  NOW() - interval '1 hour' as end_time,
  1250.00 as total_sales,
  15 as total_orders,
  'closed' as status
FROM employees
WHERE code = '4530'  -- Luffy's code
LIMIT 1;

-- Insert a sample shift register
WITH latest_shift as (
  SELECT id, employee_id
  FROM shifts
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO shift_registers (
  shift_id,
  employee_id,
  start_amount,
  end_amount,
  current_amount,
  created_at,
  closed_at
)
SELECT 
  latest_shift.id,
  latest_shift.employee_id,
  1000.00,
  2250.00,
  2250.00,
  NOW() - interval '2 hours',
  NOW() - interval '1 hour'
FROM latest_shift;

-- Insert sample cash movements
WITH latest_shift as (
  SELECT id, employee_id
  FROM shifts
  ORDER BY created_at DESC
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
  latest_shift.id,
  latest_shift.employee_id,
  amount,
  type,
  description,
  created_at
FROM latest_shift,
(VALUES 
  (250.00, 'sale', 'Table 1 order', NOW() - interval '1 hour 45 minutes'),
  (350.00, 'sale', 'Table 2 order', NOW() - interval '1 hour 30 minutes'),
  (450.00, 'sale', 'Table 3 order', NOW() - interval '1 hour 15 minutes'),
  (-100.00, 'withdrawal', 'Change request', NOW() - interval '1 hour 20 minutes'),
  (200.00, 'sale', 'Table 4 order', NOW() - interval '1 hour')
) as movements(amount, type, description, created_at);