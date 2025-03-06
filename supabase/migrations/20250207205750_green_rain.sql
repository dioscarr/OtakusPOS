-- Drop existing functions and triggers first
DROP TRIGGER IF EXISTS update_order_totals ON order_items;
DROP FUNCTION IF EXISTS calculate_order_totals();
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP FUNCTION IF EXISTS update_orders_updated_at();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal decimal(10,2);
BEGIN
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Update order totals
  UPDATE orders
  SET 
    subtotal = v_subtotal,
    itbis = v_subtotal * 0.18,
    tip = v_subtotal * 0.10,
    total = v_subtotal * 1.28
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_totals();