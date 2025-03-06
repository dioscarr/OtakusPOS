-- Clear all orders and order items
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;

-- Reset employee order counts and sales
UPDATE employees
SET total_orders = 0,
    total_sales = 0
WHERE total_orders > 0 OR total_sales > 0;