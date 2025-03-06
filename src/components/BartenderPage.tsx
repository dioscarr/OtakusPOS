import React, { useState, useEffect } from 'react';
import { Clock, Check, History } from 'lucide-react';
import { MenuItem } from '../types';
import { supabase } from '../lib/supabase';

interface BartenderPageProps {
  menuItems: MenuItem[];
  completedDrinkItems: Set<string>;
  onDrinkItemComplete: (itemId: string, completed: boolean) => void;
  onBack: () => void;
}

export function BartenderPage({ 
  menuItems, 
  completedDrinkItems,
  onDrinkItemComplete
}: BartenderPageProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [localCompletedItems, setLocalCompletedItems] = useState<Set<string>>(new Set(completedDrinkItems));
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            status,
            created_at,
            order_items (
              id,
              quantity,
              menu_item_id,
              price,
              menu_items (
                id,
                name,
                category
              )
            )
          `)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const ordersWithDrinks = (orders || []).filter(order => {
          const drinkItems = order.order_items?.filter((item: any) => {
            const category = item.menu_items?.category;
            return category === 'Beer' || category === 'Wine' || category === 'Cocktails' || 
                   category === 'Spirits' || category === 'Soft Drinks';
          });
          return drinkItems && drinkItems.length > 0;
        });

        setOrders(ordersWithDrinks);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    const ordersSubscription = supabase
      .channel('bar_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, []);

  const getDrinkItems = (order: any) => {
    return (order.order_items || []).filter((item: any) => {
      const category = item.menu_items?.category;
      return category === 'Beer' || category === 'Wine' || category === 'Cocktails' || 
             category === 'Spirits' || category === 'Soft Drinks';
    });
  };

  const groupOrdersByCustomer = (orders: any[]) => {
    const grouped = orders.reduce((acc, order) => {
      const key = order.customer_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(order);
      return acc;
    }, {});

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  const pendingDrinkOrders = orders.filter(order => {
    const drinkItems = getDrinkItems(order);
    return drinkItems.length > 0 && order.status === 'pending';
  });

  const completedDrinkOrders = orders.filter(order => 
    getDrinkItems(order).length > 0 && order.status === 'paid'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleToggleItemComplete = async (orderId: string, itemId: string) => {
    try {
      setIsUpdating(itemId);
      
      const key = `${orderId}-${itemId}`;
      const newCompletedItems = new Set(localCompletedItems);
      
      if (newCompletedItems.has(key)) {
        newCompletedItems.delete(key);
        onDrinkItemComplete(itemId, false);
      } else {
        newCompletedItems.add(key);
        onDrinkItemComplete(itemId, true);
      }
      
      setLocalCompletedItems(newCompletedItems);

      const order = orders.find(o => o.id === orderId);
      if (order) {
        const drinkItems = getDrinkItems(order);
        const allCompleted = drinkItems.every(item => 
          newCompletedItems.has(`${orderId}-${item.menu_items.id}`)
        );

        if (allCompleted) {
          const { error } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', orderId);

          if (error) throw error;

          setOrders(prev => prev.map(o => 
            o.id === orderId 
              ? { ...o, status: 'paid' }
              : o
          ));
        }
      }
    } catch (error) {
      console.error('Error updating item status:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const isItemCompleted = (orderId: string, itemId: string) => {
    return localCompletedItems.has(`${orderId}-${itemId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Cargando órdenes...</p>
      </div>
    );
  }

  const groupedPendingOrders = groupOrdersByCustomer(pendingDrinkOrders);

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Clock className="w-6 h-6" />
              Órdenes Pendientes ({pendingDrinkOrders.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
              {groupedPendingOrders.map(([customerName, customerOrders]) => (
                <div key={customerName} className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">{customerName}</h3>
                  <div className="space-y-2">
                    {customerOrders.map((order: any) => {
                      const drinkItems = getDrinkItems(order);
                      return (
                        <div key={order.id} className="space-y-2">
                          {drinkItems.map((item: any) => {
                            const menuItem = item.menu_items;
                            if (!menuItem) return null;

                            const isCompleted = isItemCompleted(order.id, menuItem.id);

                            return (
                              <button
                                key={item.id}
                                onClick={() => handleToggleItemComplete(order.id, menuItem.id)}
                                disabled={isUpdating === menuItem.id}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                                  isCompleted 
                                    ? 'bg-blue-900/50 text-blue-300' 
                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                } ${isUpdating === menuItem.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                                  isCompleted ? 'bg-blue-500 text-white' : 'bg-gray-600'
                                }`}>
                                  {isCompleted && <Check size={14} />}
                                </div>
                                <span className={`flex-grow text-left ${isCompleted ? 'line-through' : ''}`}>
                                  {menuItem.name}
                                </span>
                                <span className={`flex-shrink-0 text-lg font-medium pl-4 ${
                                  isCompleted ? 'text-blue-400' : ''
                                }`}>
                                  ×{item.quantity}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {pendingDrinkOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No hay órdenes pendientes
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <History className="w-6 h-6" />
              Completadas ({completedDrinkOrders.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
              {completedDrinkOrders.map((order) => {
                const drinkItems = getDrinkItems(order);

                return (
                  <div key={order.id} className="border-b border-gray-700 pb-4 last:border-b-0">
                    <div className="mb-2">
                      <h3 className="font-bold text-white">{order.customer_name}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {drinkItems.map((item: any) => {
                        const menuItem = item.menu_items;
                        if (!menuItem) return null;

                        return (
                          <div key={item.id} className="flex items-center justify-between">
                            <span className="line-through text-gray-400">{menuItem.name}</span>
                            <span className="flex-shrink-0 font-medium text-gray-400 pl-4">×{item.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {completedDrinkOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No hay órdenes completadas
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}