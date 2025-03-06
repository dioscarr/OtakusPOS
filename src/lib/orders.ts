import { supabase } from './supabase';

export async function clearAllOrders() {
  try {
    // First clear order items (will cascade delete)
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (orderItemsError) throw orderItemsError;

    // Then clear orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (ordersError) throw ordersError;

    // Reset employee order counts and sales
    const { error: employeesError } = await supabase
      .from('employees')
      .update({
        total_orders: 0,
        total_sales: 0,
        cash_in_drawer: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (employeesError) throw employeesError;

    return { success: true };
  } catch (error) {
    console.error('Error clearing orders:', error);
    return { success: false, error };
  }
}