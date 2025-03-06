-- Migrate existing orders to tabs
INSERT INTO tabs (
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
  created_at,
  closed_at
)
SELECT
  customer_name,
  table_number,
  CASE 
    WHEN status = 'paid' THEN 'closed'
    WHEN status = 'pending' THEN 'open'
    ELSE 'closed'
  END,
  subtotal,
  itbis,
  tip,
  total,
  is_fiscal,
  fiscal_number,
  payment_method,
  employee_id,
  created_at,
  CASE 
    WHEN status = 'paid' THEN created_at
    ELSE null
  END
FROM orders;

-- Migrate order items to tab items
INSERT INTO tab_items (
  tab_id,
  menu_item_id,
  quantity,
  price,
  status,
  created_at,
  served_at
)
SELECT
  t.id,
  oi.menu_item_id,
  oi.quantity,
  oi.price,
  CASE 
    WHEN o.status = 'paid' THEN 'served'
    WHEN o.food_ready THEN 'ready'
    ELSE 'pending'
  END,
  oi.created_at,
  CASE 
    WHEN o.status = 'paid' THEN o.created_at
    ELSE null
  END
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN tabs t ON t.created_at = o.created_at AND t.customer_name = o.customer_name;