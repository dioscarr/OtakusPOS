import React, { useState, useEffect } from 'react';
import { MenuPanel } from './components/MenuPanel';
import { OrderPanel } from './components/OrderPanel';
import { KitchenPage } from './components/KitchenPage';
import { SalesHistoryPage } from './components/SalesHistoryPage';
import { OperationsPage } from './components/OperationsPage';
import { BartenderPage } from './components/BartenderPage';
import { Notification } from './components/Notification';
import { LoginModal } from './components/LoginModal';
import { CashDrawerModal } from './components/CashDrawerModal';
import { ShiftSummaryModal } from './components/ShiftSummaryModal';
import { Beer, TrendingUp, Soup, PlayCircle, StopCircle, BarChart3, Plus, Tablet, Menu as MenuIcon } from 'lucide-react';
import { Tab, OrderItem, Notification as NotificationType, MenuItem, Employee } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState<'pos' | 'sales' | 'kitchen' | 'bar' | 'operations'>('pos');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  const [completedFoodItems, setCompletedFoodItems] = useState<Set<string>>(new Set());
  const [completedDrinkItems, setCompletedDrinkItems] = useState<Set<string>>(new Set());
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setMenuItems(data || []);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setNotifications(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            message: 'Error loading menu items. Please try again.'
          }
        ]);
      }
    };

    fetchMenuItems();

    // Set up real-time subscription for menu items
    const menuItemsSubscription = supabase
      .channel('menu_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        async () => {
          // Fetch updated menu items
          const { data: updatedMenuItems, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

          if (error) {
            console.error('Error fetching updated menu items:', error);
            return;
          }

          setMenuItems(updatedMenuItems || []);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      menuItemsSubscription.unsubscribe();
    };
  }, []);

  const createOrder = async (items: { itemId: string; quantity: number }[], customerName: string, tableNumber: number, category: 'Food' | 'Drinks') => {
    try {
      if (!currentEmployee?.id) {
        throw new Error('No employee logged in');
      }

      if (currentEmployee.shift_status !== 'active') {
        throw new Error('Employee shift is not active');
      }

      // Filter items by category
      const filteredItems = items.filter(item => {
        const menuItem = menuItems.find(m => m.id === item.itemId);
        if (!menuItem) return false;
        
        if (category === 'Food') {
          return menuItem.category === 'Food';
        } else {
          return ['Beer', 'Wine', 'Cocktails', 'Spirits', 'Soft Drinks'].includes(menuItem.category);
        }
      });

      if (filteredItems.length === 0) {
        throw new Error(`No ${category.toLowerCase()} items found in order`);
      }

      // Prepare items with prices
      const itemsWithPrices = filteredItems.map(item => {
        const menuItem = menuItems.find(m => m.id === item.itemId);
        if (!menuItem) throw new Error(`Menu item not found: ${item.itemId}`);
        return {
          menu_item_id: item.itemId,
          quantity: item.quantity,
          price: menuItem.price
        };
      });

      // Create order using the stored procedure
      const { data: order, error } = await supabase.rpc(
        'create_order_with_items',
        {
          p_customer_name: customerName,
          p_table_number: tableNumber,
          p_employee_id: currentEmployee.id,
          p_items: itemsWithPrices
        }
      );

      if (error) {
        throw error;
      }

      if (!order) {
        throw new Error('Order was not created');
      }

      return order;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error(`Error creating ${category.toLowerCase()} order:`, message);
      throw err;
    }
  };

  const handleAddTab = () => {
    if (!currentEmployee?.id) {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: 'Please log in to create a tab'
        }
      ]);
      return;
    }

    if (currentEmployee.shift_status !== 'active') {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: 'Please start your shift to create a tab'
        }
      ]);
      return;
    }

    const tabNumber = tabs.length + 1;
    const customerName = `Customer ${tabNumber}`;
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name: customerName,
      customerName,
      tableNumber: tabNumber,
      status: 'open',
      subtotal: 0,
      itbis: 0,
      tip: 0,
      total: 0,
      isFiscal: false,
      employeeId: currentEmployee.id,
      createdAt: new Date(),
      items: [],
      isOpen: true
    };

    setTabs(prev => [newTab, ...prev.map(tab => ({ ...tab, isOpen: false }))]);
    setActiveTabId(newTab.id);
  };

  const handleAddOrderItem = async (itemId: string) => {
    if (!activeTabId) {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: 'No active tab selected'
        }
      ]);
      return;
    }

    if (!currentEmployee?.id) {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: 'Please log in to add items'
        }
      ]);
      return;
    }

    if (currentEmployee.shift_status !== 'active') {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: 'Please start your shift to add items'
        }
      ]);
      return;
    }
    
    try {
      const tab = tabs.find(t => t.id === activeTabId);
      if (!tab) {
        throw new Error('Tab not found');
      }

      const menuItem = menuItems.find(item => item.id === itemId);
      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      // Update the tab's items first for immediate UI feedback
      setTabs(prev => prev.map(tab => {
        if (tab.id !== activeTabId) return tab;
        
        const existingItem = tab.items.find(item => item.itemId === itemId);
        if (existingItem) {
          return {
            ...tab,
            items: tab.items.map(item =>
              item.itemId === itemId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          };
        }
        return {
          ...tab,
          items: [...tab.items, { itemId, quantity: 1 }]
        };
      }));

      // Create appropriate order based on item category
      if (menuItem.category === 'Food') {
        await createOrder(
          [{ itemId, quantity: 1 }],
          tab.customerName,
          tab.tableNumber,
          'Food'
        );
      } else if (['Beer', 'Wine', 'Cocktails', 'Spirits', 'Soft Drinks'].includes(menuItem.category)) {
        await createOrder(
          [{ itemId, quantity: 1 }],
          tab.customerName,
          tab.tableNumber,
          'Drinks'
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error adding order item:', message);
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: `Failed to add item: ${message}`
        }
      ]);
    }
  };

  const handleFoodItemComplete = (itemId: string, completed: boolean) => {
    const newCompletedItems = new Set(completedFoodItems);
    if (completed) {
      newCompletedItems.add(itemId);
    } else {
      newCompletedItems.delete(itemId);
    }
    setCompletedFoodItems(newCompletedItems);
  };

  const handleDrinkItemComplete = (itemId: string, completed: boolean) => {
    const newCompletedItems = new Set(completedDrinkItems);
    if (completed) {
      newCompletedItems.add(itemId);
    } else {
      newCompletedItems.delete(itemId);
    }
    setCompletedDrinkItems(newCompletedItems);
  };

  const handleRemoveOrderItem = (tabId: string, itemId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      return {
        ...tab,
        items: tab.items.filter(item => item.itemId !== itemId)
      };
    }));
  };

  const handleUpdateQuantity = (tabId: string, itemId: string, quantity: number) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      return {
        ...tab,
        items: tab.items.map(item =>
          item.itemId === itemId
            ? { ...item, quantity }
            : item
        ).filter(item => item.quantity > 0)
      };
    }));
  };

  const handleUpdateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, ...updates, name: updates.customerName || tab.name } : tab
    ));
  };

  const handleRemoveTab = (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId(null);
    }
  };

  if (!currentEmployee) {
    return <LoginModal onLogin={setCurrentEmployee} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-[#D80000] text-white shadow">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <img 
              src="https://topanimebar.com/wp-content/uploads/2025/02/OTAKUPOS-Logo.svg" 
              alt="OTAKU POS Logo" 
              className="h-8"
            />
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-md hover:bg-white/10"
            >
              <MenuIcon size={24} />
            </button>
            <div className="hidden lg:flex gap-4">
              <button
                onClick={() => setCurrentPage('pos')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'pos'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Tablet size={20} className="text-white" />
                POS
              </button>
              <button
                onClick={() => setCurrentPage('bar')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'bar'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Beer size={20} className="text-white" />
                Bar
              </button>
              <button
                onClick={() => setCurrentPage('kitchen')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'kitchen'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Soup size={20} className="text-white" />
                Cocina
              </button>
              <button
                onClick={() => setCurrentPage('operations')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'operations'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <BarChart3 size={20} className="text-white" />
                Operaciones
              </button>
              <button
                onClick={() => setCurrentPage('sales')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'sales'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <TrendingUp size={20} className="text-white" />
                Ventas
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{currentEmployee?.name}</p>
                <p className="text-sm text-white/80">
                  {currentEmployee?.shift_status === 'active' ? 'En turno' : 'Fuera de turno'}
                </p>
              </div>
              {currentEmployee?.shift_status === 'active' ? (
                <button
                  onClick={() => setShowEndShift(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30"
                >
                  <StopCircle size={20} className="text-white" />
                  Finalizar Turno
                </button>
              ) : (
                <button
                  onClick={() => setShowCashDrawer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30"
                >
                  <PlayCircle size={20} className="text-white" />
                  Iniciar Turno
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 border-t border-white/10 pt-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentPage('pos');
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'pos'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Tablet size={20} className="text-white" />
                POS
              </button>
              <button
                onClick={() => {
                  setCurrentPage('bar');
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'bar'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Beer size={20} className="text-white" />
                Bar
              </button>
              <button
                onClick={() => {
                  setCurrentPage('kitchen');
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'kitchen'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <Soup size={20} className="text-white" />
                Cocina
              </button>
              <button
                onClick={() => {
                  setCurrentPage('operations');
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'operations'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <BarChart3 size={20} className="text-white" />
                Operaciones
              </button>
              <button
                onClick={() => {
                  setCurrentPage('sales');
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-2 rounded-md flex items-center gap-2 ${
                  currentPage === 'sales'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <TrendingUp size={20} className="text-white" />
                Ventas
              </button>
              <div className="pt-4 border-t border-white/10">
                <div className="text-center mb-2">
                  <p className="font-medium">{currentEmployee?.name}</p>
                  <p className="text-sm text-white/80">
                    {currentEmployee?.shift_status === 'active' ? 'En turno' : 'Fuera de turno'}
                  </p>
                </div>
                {currentEmployee?.shift_status === 'active' ? (
                  <button
                    onClick={() => {
                      setShowEndShift(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30"
                  >
                    <StopCircle size={20} className="text-white" />
                    Finalizar Turno
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowCashDrawer(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30"
                  >
                    <PlayCircle size={20} className="text-white" />
                    Iniciar Turno
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-4 py-6">
        {currentPage === 'pos' && (
          <div className="flex flex-col gap-6">
            <div className="w-full bg-gray-800 rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-md transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-[#D80000] text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
                <button
                  onClick={handleAddTab}
                  disabled={!currentEmployee?.shift_status || currentEmployee.shift_status !== 'active'}
                  className={`flex-shrink-0 px-4 py-2 rounded-md flex items-center gap-2 ${
                    currentEmployee?.shift_status === 'active'
                      ? 'bg-[#D80000] text-white hover:bg-[#ff1a1a]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Plus size={20} />
                  Nueva Cuenta
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:flex-grow">
                <MenuPanel
                  menuItems={menuItems}
                  onAddItem={handleAddOrderItem}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
              <div className="w-full lg:w-[30%] lg:flex-shrink-0">
                <OrderPanel
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onCreateTab={handleAddTab}
                  onCloseTab={handleRemoveTab}
                  onSelectTab={setActiveTabId}
                  onUpdateTab={handleUpdateTab}
                  menuItems={menuItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveOrderItem}
                  currentEmployee={currentEmployee}
                />
              </div>
            </div>
          </div>
        )}
        {currentPage === 'bar' && (
          <BartenderPage
            menuItems={menuItems}
            completedDrinkItems={completedDrinkItems}
            onDrinkItemComplete={handleDrinkItemComplete}
            onBack={() => setCurrentPage('pos')}
          />
        )}
        {currentPage === 'kitchen' && (
          <KitchenPage
            menuItems={menuItems}
            completedFoodItems={completedFoodItems}
            onFoodItemComplete={handleFoodItemComplete}
            onBack={() => setCurrentPage('pos')}
          />
        )}
        {currentPage === 'operations' && (
          <OperationsPage
            menuItems={menuItems}
            onBack={() => setCurrentPage('pos')}
          />
        )}
        {currentPage === 'sales' && (
          <SalesHistoryPage
            currentEmployee={currentEmployee}
            onBack={() => setCurrentPage('pos')}
          />
        )}
      </main>

      {/* Modals */}
      {showCashDrawer && (
        <CashDrawerModal
          onSubmit={(amount) => {
            if (currentEmployee) {
              setCurrentEmployee({
                ...currentEmployee,
                shift_status: 'active',
                shift_start_time: new Date().toISOString(),
                cash_in_drawer: amount
              });
            }
            setShowCashDrawer(false);
          }}
          onCancel={() => setShowCashDrawer(false)}
        />
      )}

      {showEndShift && currentEmployee && (
        <ShiftSummaryModal
          employee={currentEmployee}
          onClose={() => setShowEndShift(false)}
          onConfirm={() => {
            setCurrentEmployee(null);
            setShowEndShift(false);
          }}
        />
      )}

      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          onClose={() => setNotifications(prev => 
            prev.filter(n => n.id !== notification.id)
          )}
        />
      ))}
    </div>
  );
}