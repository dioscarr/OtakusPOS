-- Drop order-related tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Reset employee order counts and sales
UPDATE employees
SET total_orders = 0,
    total_sales = 0,
    cash_in_drawer = 0
WHERE total_orders > 0 OR total_sales > 0 OR cash_in_drawer > 0;

-- Reset active shifts
UPDATE shifts
SET total_orders = 0,
    total_sales = 0,
    cash_in_drawer = 0
WHERE status = 'active' AND (total_orders > 0 OR total_sales > 0 OR cash_in_drawer > 0);