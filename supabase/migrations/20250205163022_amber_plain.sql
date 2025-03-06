/*
  # Add delete_order_with_items function

  Creates a stored procedure to delete an order and its items in a transaction
*/

CREATE OR REPLACE FUNCTION delete_order_with_items(order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete in a transaction to ensure both operations succeed or fail together
  DELETE FROM order_items WHERE order_id = $1;
  DELETE FROM orders WHERE id = $1;
END;
$$;