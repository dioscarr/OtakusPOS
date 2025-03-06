-- Drop the function if it exists
DROP FUNCTION IF EXISTS delete_order_with_items;

-- Create the function with proper schema and parameters
CREATE OR REPLACE FUNCTION public.delete_order_with_items(order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete order items first (cascade will handle this automatically, but being explicit)
  DELETE FROM order_items WHERE order_id = $1;
  
  -- Then delete the order
  DELETE FROM orders WHERE id = $1;
END;
$$;

-- Grant execute permission to public since RLS will handle security
GRANT EXECUTE ON FUNCTION public.delete_order_with_items(uuid) TO public;