import React, { useState, useRef } from 'react';
import { Receipt, X, Printer } from 'lucide-react';
import { Order, MenuItem } from '../types';

interface OrdersPageProps {
  orders: Order[];
  menuItems: MenuItem[];
  onEditOrder: (orderId: string) => void;
  onCompleteOrder: (orderId: string, paymentMethod: 'cash' | 'card') => void;
  onBack: () => void;
}

export function OrdersPage({ orders, menuItems, onEditOrder, onCompleteOrder, onBack }: OrdersPageProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'paid'>('open');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => 
    activeTab === 'open' ? order.status === 'pending' : order.status === 'paid'
  );

  // Group filtered orders by date
  const groupedOrders = filteredOrders.reduce((groups: { [key: string]: Order[] }, order) => {
    const date = new Date(order.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(order);
    return groups;
  }, {});

  const handleOpenOrder = (order: Order) => {
    onEditOrder(order.id);
  };

  const handlePrint = () => {
    const receiptContent = receiptRef.current;
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const businessInfo = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 5px;">One Piece Bar & Tapas</h1>
        <p style="margin: 5px 0;">Roberto Pastoriza 12</p>
        <p style="margin: 5px 0;">Santiago de los Caballeros 51000</p>
        <p style="margin: 5px 0;">Dominican Republic</p>
        <p style="margin: 5px 0;">(829) 947-7217</p>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .total-line {
              font-weight: bold;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${businessInfo}
          ${receiptContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'open'
                ? 'bg-[#D80000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Open Orders
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'paid'
                ? 'bg-[#D80000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Paid Orders
          </button>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date} className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-white">{date}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateOrders.map((order) => (
                  <div key={order.id} className="bg-gray-700 rounded-lg p-4 shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{order.customerName}</h3>
                        <p className="text-sm text-gray-400">Table {order.tableNumber}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </p>
                        {order.fiscalNumber && (
                          <p className="text-sm font-medium text-gray-300 mt-1">
                            RNC: {order.fiscalNumber}
                          </p>
                        )}
                        {order.paymentMethod && (
                          <p className="text-sm font-medium text-gray-300">
                            Payment: {order.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          order.status === 'paid'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => {
                        const menuItem = menuItems.find(m => m.id === item.itemId);
                        if (!menuItem) return null;
                        return (
                          <div key={item.itemId} className="flex justify-between text-sm text-gray-300">
                            <span>{menuItem.name} x{item.quantity}</span>
                            <span>RD${(menuItem.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-1 text-sm border-t border-gray-600 pt-2">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal:</span>
                        <span>RD${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>ITBIS (18%):</span>
                        <span>RD${order.itbis.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tip (10%):</span>
                        <span>RD${order.tip.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-600 pt-1 text-white">
                        <span>Total:</span>
                        <span>RD${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      {activeTab === 'open' ? (
                        <button
                          onClick={() => handleOpenOrder(order)}
                          className="px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a]"
                        >
                          Open Order
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowReceipt(order.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-900/50 text-blue-300 rounded-md hover:bg-blue-800/50"
                        >
                          <Receipt size={16} />
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedOrders).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No {activeTab} orders found
            </div>
          )}
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Receipt</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setShowReceipt(null)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {(() => {
              const order = orders.find(o => o.id === showReceipt);
              if (!order) return null;

              return (
                <div ref={receiptRef} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h1 className="text-xl font-bold">One Piece Bar & Tapas</h1>
                    <p className="text-sm text-gray-400">Roberto Pastoriza 12</p>
                    <p className="text-sm text-gray-400">Santiago de los Caballeros 51000</p>
                    <p className="text-sm text-gray-400">Dominican Republic</p>
                    <p className="text-sm text-gray-400">(829) 947-7217</p>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="font-semibold">{order.customerName}</h3>
                    <p className="text-sm text-gray-400">Table {order.tableNumber}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(order.timestamp).toLocaleString()}
                    </p>
                    {order.fiscalNumber && (
                      <p className="text-sm font-medium mt-1">RNC: {order.fiscalNumber}</p>
                    )}
                    {order.paymentMethod && (
                      <p className="text-sm font-medium">
                        Payment Method: {order.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const menuItem = menuItems.find(m => m.id === item.itemId);
                      if (!menuItem) return null;
                      return (
                        <div key={item.itemId} className="flex justify-between">
                          <span>{menuItem.name} x{item.quantity}</span>
                          <span>RD${(menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1 border-t border-gray-700 pt-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal:</span>
                      <span>RD${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>ITBIS (18%):</span>
                      <span>RD${order.itbis.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Tip (10%):</span>
                      <span>RD${order.tip.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                      <span>Total:</span>
                      <span>RD${order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-400 pt-4">
                    Thank you for visiting!
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}