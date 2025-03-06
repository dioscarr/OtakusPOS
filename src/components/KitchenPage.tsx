import React, { useState, useEffect } from 'react';
import { Clock, Check, History } from 'lucide-react';
import { MenuItem } from '../types';
import { supabase } from '../lib/supabase';

interface KitchenPageProps {
  menuItems: MenuItem[];
  completedFoodItems: Set<string>;
  onFoodItemComplete: (itemId: string, completed: boolean) => void;
  onBack: () => void;
}

export function KitchenPage({ 
  menuItems, 
  completedFoodItems,
  onFoodItemComplete
}: KitchenPageProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [localCompletedItems, setLocalCompletedItems] = useState<Set<string>>(new Set(completedFoodItems));
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            table_number,
            status,
            created_at,
            updated_at,
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

        const ordersWithFood = (orders || []).filter(order => {
          const foodItems = order.order_items?.filter((item: any) => 
            item.menu_items?.category === 'Food'
          );
          return foodItems && foodItems.length > 0;
        });

        setOrders(ordersWithFood);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    const ordersSubscription = supabase
      .channel('kitchen_orders')
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

  const getFoodItems = (order: any) => {
    return (order.order_items || []).filter((item: any) => 
      item.menu_items?.category === 'Food'
    );
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

  const pendingFoodOrders = orders.filter(order => {
    const foodItems = getFoodItems(order);
    return foodItems.length > 0 && order.status === 'pending';
  });

  const completedFoodOrders = orders.filter(order => 
    getFoodItems(order).length > 0 && order.status === 'paid'
  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleToggleItemComplete = async (orderId: string, itemId: string) => {
    try {
      setIsUpdating(itemId);
      
      const key = `${orderId}-${itemId}`;
      const newCompletedItems = new Set(localCompletedItems);
      
      if (newCompletedItems.has(key)) {
        newCompletedItems.delete(key);
        onFoodItemComplete(itemId, false);
      } else {
        newCompletedItems.add(key);
        onFoodItemComplete(itemId, true);
      }
      
      setLocalCompletedItems(newCompletedItems);

      const order = orders.find(o => o.id === orderId);
      if (order) {
        const foodItems = getFoodItems(order);
        const allCompleted = foodItems.every(item => 
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

  const getOrderAgeColor = (createdAt: string) => {
    const orderTime = new Date(createdAt).getTime();
    const minutesElapsed = (currentTime.getTime() - orderTime) / (1000 * 60);

    if (minutesElapsed < 5) {
      return 'bg-gray-700'; // Fresh orders (< 5 minutes)
    } else if (minutesElapsed < 10) {
      return 'bg-yellow-900/50'; // Getting older (5-10 minutes)
    } else if (minutesElapsed < 15) {
      return 'bg-orange-900/50'; // Urgent (10-15 minutes)
    } else {
      return 'bg-red-900/50'; // Critical (> 15 minutes)
    }
  };

  const getOrderAgeText = (createdAt: string) => {
    const orderTime = new Date(createdAt).getTime();
    const minutesElapsed = Math.floor((currentTime.getTime() - orderTime) / (1000 * 60));

    if (minutesElapsed < 1) {
      return 'Ahora mismo';
    } else if (minutesElapsed === 1) {
      return 'Hace 1 minuto';
    } else {
      return `Hace ${minutesElapsed} minutos`;
    }
  };

  const formatCompletionTime = (updatedAt: string) => {
    const date = new Date(updatedAt);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Cargando órdenes...</p>
      </div>
    );
  }

  const groupedPendingOrders = groupOrdersByCustomer(pendingFoodOrders);

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Clock className="w-6 h-6" />
              Órdenes Pendientes ({pendingFoodOrders.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
              {groupedPendingOrders.map(([customerName, customerOrders]) => (
                <div key={customerName} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-white">{customerName}</h3>
                    <span className="text-sm text-gray-400">Mesa {customerOrders[0].table_number}</span>
                  </div>
                  <div className="space-y-2">
                    {customerOrders.map((order: any) => {
                      const foodItems = getFoodItems(order);
                      return (
                        <div key={order.id} className="space-y-2">
                          {foodItems.map((item: any) => {
                            const menuItem = item.menu_items;
                            if (!menuItem) return null;

                            const isCompleted = isItemCompleted(order.id, menuItem.id);
                            const orderColor = getOrderAgeColor(order.created_at);
                            const orderAge = getOrderAgeText(order.created_at);

                            return (
                              <button
                                key={item.id}
                                onClick={() => handleToggleItemComplete(order.id, menuItem.id)}
                                disabled={isUpdating === menuItem.id}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                  isCompleted 
                                    ? 'bg-green-900/50 text-green-300' 
                                    : `${orderColor} hover:bg-opacity-80 text-white`
                                } ${isUpdating === menuItem.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                                  isCompleted ? 'bg-green-500 text-white' : 'bg-gray-600'
                                }`}>
                                  {isCompleted && <Check size={14} />}
                                </div>
                                <span className={`flex-grow text-left ${isCompleted ? 'line-through' : ''}`}>
                                  {menuItem.name}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-300">{orderAge}</span>
                                  <span className={`flex-shrink-0 text-lg font-medium ${
                                    isCompleted ? 'text-green-400' : ''
                                  }`}>
                                    ×{item.quantity}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {pendingFoodOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No hay órdenes pendientes
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <History className="w-6 h-6" />
              Completadas ({completedFoodOrders.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
              {completedFoodOrders.map((order) => {
                const foodItems = getFoodItems(order);

                return (
                  <div key={order.id} className="border-b border-gray-700 pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">{order.customer_name}</h3>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Mesa {order.table_number}</p>
                        <p className="text-xs text-gray-500">
                          Completada a las {formatCompletionTime(order.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {foodItems.map((item: any) => {
                        const menuItem = item.menu_items;
                        if (!menuItem) return null;

                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-700/30 px-4 py-2">
                            <span className="line-through text-gray-400">{menuItem.name}</span>
                            <span className="flex-shrink-0 font-medium text-gray-400">×{item.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {completedFoodOrders.length === 0 && (
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