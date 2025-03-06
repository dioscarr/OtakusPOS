import React, { useState, useRef } from 'react';
import { Minus, Trash2, Receipt, X, Printer, DollarSign, Plus } from 'lucide-react';
import { Tab, MenuItem, Employee } from '../types';
import { CashPaymentModal } from './CashPaymentModal';
import { supabase } from '../lib/supabase';

interface OrderPanelProps {
  tabs: Tab[];
  activeTabId: string | null;
  onCreateTab: (name: string) => void;
  onCloseTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  onUpdateTab: (tabId: string, updates: Partial<Tab>) => void;
  menuItems: MenuItem[];
  onUpdateQuantity: (tabId: string, itemId: string, change: number) => void;
  onRemoveItem: (tabId: string, itemId: string) => void;
  currentEmployee: Employee;
}

export function OrderPanel({
  tabs,
  activeTabId,
  onCreateTab,
  onCloseTab,
  onSelectTab,
  onUpdateTab,
  menuItems,
  onUpdateQuantity,
  onRemoveItem,
  currentEmployee
}: OrderPanelProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const receiptRef = useRef<HTMLDivElement>(null);

  const activeTab = activeTabId ? tabs.find(tab => tab.id === activeTabId) : null;

  const getItemTotal = (itemId: string, quantity: number) => {
    const menuItem = menuItems.find(item => item.id === itemId);
    return menuItem ? menuItem.price * quantity : 0;
  };

  const calculateTotals = (tab: Tab) => {
    const subtotal = tab.items.reduce((sum, item) => sum + getItemTotal(item.itemId, item.quantity), 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const itbis = subtotalAfterDiscount * 0.18;
    const tip = subtotalAfterDiscount * 0.10;
    return {
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      itbis,
      tip,
      total: subtotalAfterDiscount + itbis + tip
    };
  };

  const handlePayment = async (method: 'cash' | 'card') => {
    if (!activeTab) return;
    
    try {
      setError(null);
      setIsProcessing(true);

      if (!currentEmployee?.shift_status || currentEmployee.shift_status !== 'active') {
        throw new Error('No active shift. Please start a shift first.');
      }

      if (activeTab.items.length === 0) {
        throw new Error('Please add items to the order');
      }

      const totals = calculateTotals(activeTab);

      if (method === 'cash') {
        setShowCashPayment(true);
      } else {
        // Create receipt for card payment
        const { error: receiptError } = await supabase
          .from('receipts')
          .insert({
            customer_name: activeTab.customerName,
            table_number: activeTab.tableNumber,
            subtotal: totals.subtotal,
            itbis: totals.itbis,
            tip: totals.tip,
            total: totals.total,
            payment_method: method,
            employee_id: currentEmployee.id
          });

        if (receiptError) throw receiptError;

        // Update employee totals
        const { error: employeeError } = await supabase
          .from('employees')
          .update({
            total_orders: (currentEmployee.total_orders || 0) + 1,
            total_sales: (currentEmployee.total_sales || 0) + totals.total
          })
          .eq('id', currentEmployee.id);

        if (employeeError) throw employeeError;

        setShowReceipt(true);
      }

      setShowPayment(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Payment error:', message);
      setError(message);
      setShowPayment(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPaymentComplete = async (amountReceived: number) => {
    if (!activeTab) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      const totals = calculateTotals(activeTab);

      // Create receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .insert({
          customer_name: activeTab.customerName,
          table_number: activeTab.tableNumber,
          subtotal: totals.subtotal,
          itbis: totals.itbis,
          tip: totals.tip,
          total: totals.total,
          payment_method: 'cash',
          employee_id: currentEmployee.id
        });

      if (receiptError) throw receiptError;

      // Update employee totals
      const { error: employeeError } = await supabase
        .from('employees')
        .update({
          total_orders: (currentEmployee.total_orders || 0) + 1,
          total_sales: (currentEmployee.total_sales || 0) + totals.total,
          cash_in_drawer: (currentEmployee.cash_in_drawer || 0) + amountReceived
        })
        .eq('id', currentEmployee.id);

      if (employeeError) throw employeeError;

      setShowCashPayment(false);
      setShowReceipt(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Cash payment error:', message);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    if (!activeTab) return;
    setShowPrintPreview(true);
  };

  const handleActualPrint = () => {
    if (!activeTab) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totals = calculateTotals(activeTab);

    // Group items by name and sum quantities
    const groupedItems = activeTab.items.reduce((acc: { [key: string]: { name: string; quantity: number; price: number; total: number } }, item) => {
      const menuItem = menuItems.find(m => m.id === item.itemId);
      if (!menuItem) return acc;

      if (!acc[menuItem.name]) {
        acc[menuItem.name] = {
          name: menuItem.name,
          quantity: 0,
          price: menuItem.price,
          total: 0
        };
      }
      acc[menuItem.name].quantity += item.quantity;
      acc[menuItem.name].total = acc[menuItem.name].quantity * acc[menuItem.name].price;
      return acc;
    }, {});

    const itemsHtml = Object.values(groupedItems)
      .map(item => `
        <div class="receipt-item">
          <span>${item.name} x${item.quantity}</span>
          <span>RD$${item.total.toFixed(2)}</span>
        </div>
      `)
      .join('');

    const businessInfo = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 5px;">One Piece Bar & Tapas</h1>
        <p style="margin: 5px 0;">Roberto Pastoriza 12</p>
        <p style="margin: 5px 0;">Santiago de los Caballeros 51000</p>
        <p style="margin: 5px 0;">Dominican Republic</p>
        <p style="margin: 5px 0;">(829) 947-7217</p>
      </div>
    `;

    const orderInfo = `
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0;"><strong>Cliente:</strong> ${activeTab.customerName}</p>
        ${activeTab.isFiscal && activeTab.fiscalNumber ? 
          `<p style="margin: 5px 0;"><strong>RNC:</strong> ${activeTab.fiscalNumber}</p>` :
          `<p style="margin: 5px 0;"><strong>Mesa:</strong> ${activeTab.tableNumber}</p>`
        }
        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    const totalsHtml = `
      <div class="divider"></div>
      <div class="receipt-item">
        <span>Subtotal:</span>
        <span>RD$${totals.subtotal.toFixed(2)}</span>
      </div>
      ${discountPercent > 0 ? `
        <div class="receipt-item text-danger">
          <span>Descuento (${discountPercent}%):</span>
          <span>-RD$${totals.discountAmount.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="receipt-item">
        <span>ITBIS (18%):</span>
        <span>RD$${totals.itbis.toFixed(2)}</span>
      </div>
      <div class="receipt-item">
        <span>Propina (10%):</span>
        <span>RD$${totals.tip.toFixed(2)}</span>
      </div>
      <div class="divider"></div>
      <div class="receipt-item total-line">
        <span>Total:</span>
        <span>RD$${totals.total.toFixed(2)}</span>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
              color: #000;
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
              font-size: 1.2em;
              margin-top: 10px;
            }
            .text-danger {
              color: #dc3545;
            }
            @media print {
              body {
                width: 80mm;
                margin: 0;
                padding: 10px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${businessInfo}
          ${orderInfo}
          <div class="items">
            ${itemsHtml}
          </div>
          ${totalsHtml}
          <div style="text-align: center; margin-top: 20px;">
            <p>¡Gracias por su visita!</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="h-full bg-gray-800 rounded-lg shadow-lg p-4 text-white">
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {activeTab ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              value={activeTab.customerName}
              onChange={(e) => onUpdateTab(activeTab.id, { customerName: e.target.value })}
              placeholder="Ingrese nombre del cliente"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Número de Mesa
            </label>
            <input
              type="number"
              min="1"
              value={activeTab.tableNumber}
              onChange={(e) => onUpdateTab(activeTab.id, { tableNumber: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeTab.isFiscal}
                  onChange={(e) => onUpdateTab(activeTab.id, { isFiscal: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700 text-[#D80000] focus:ring-[#D80000]"
                />
                <span className="font-medium">Crédito Fiscal</span>
              </label>
              {!activeTab.isFiscal && (
                <button
                  onClick={() => onUpdateTab(activeTab.id, { isFiscal: true })}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-[#D80000] text-white rounded hover:bg-[#ff1a1a]"
                >
                  <Plus size={16} />
                  Agregar RNC
                </button>
              )}
            </div>
            {activeTab.isFiscal && (
              <div className="flex items-center gap-2 mt-2">
                <span className="font-medium">RNC:</span>
                <input
                  type="text"
                  value={activeTab.fiscalNumber || ''}
                  onChange={(e) => onUpdateTab(activeTab.id, { fiscalNumber: e.target.value })}
                  placeholder="Ingrese número RNC"
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                />
              </div>
            )}
          </div>

          <div className="space-y-4 max-h-[calc(100vh-500px)] lg:max-h-[300px] overflow-y-auto">
            {activeTab.items.map((item) => {
              const menuItem = menuItems.find(m => m.id === item.itemId);
              if (!menuItem) return null;
              
              return (
                <div key={item.itemId} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                  <div>
                    <p className="font-medium">{menuItem.name}</p>
                    <p className="text-xs text-gray-400">RD${menuItem.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(activeTab.id, item.itemId, -1)}
                      className="p-1 hover:bg-gray-500 rounded"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onRemoveItem(activeTab.id, item.itemId)}
                      className="p-1 hover:bg-gray-500 rounded text-red-400 ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {activeTab.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-sm">
                  RD${calculateTotals(activeTab).subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Descuento (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
                <span className="text-sm text-red-400">
                  -RD${calculateTotals(activeTab).discountAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ITBIS (18%):</span>
                <span className="text-sm">
                  RD${calculateTotals(activeTab).itbis.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Propina (10%):</span>
                <span className="text-sm">
                  RD${calculateTotals(activeTab).tip.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold pt-2 border-t border-gray-600">
                <span>Total:</span>
                <span>RD${calculateTotals(activeTab).total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onCloseTab(activeTab.id)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
            >
              Cerrar Cuenta
            </button>
            {activeTab.items.length > 0 && (
              <>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  disabled={!currentEmployee?.shift_status || currentEmployee.shift_status !== 'active' || isProcessing}
                  className={`flex-1 px-4 py-2 text-white rounded-md flex items-center justify-center gap-2 ${
                    currentEmployee?.shift_status === 'active' && !isProcessing
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Receipt size={20} />
                  {isProcessing ? 'Procesando...' : 'Pagar'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No hay cuenta activa
        </div>
      )}

      {showPayment && activeTab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Seleccione Método de Pago</h2>
              <button 
                onClick={() => setShowPayment(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => handlePayment('cash')}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Efectivo
              </button>
              <button
                onClick={() => handlePayment('card')}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}

      {showCashPayment && activeTab && (
        <CashPaymentModal
          total={calculateTotals(activeTab).total}
          onConfirm={handleCashPaymentComplete}
          onCancel={() => setShowCashPayment(false)}
        />
      )}

      {showReceipt && activeTab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recibo</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleActualPrint}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => {
                    setShowReceipt(false);
                    onCloseTab(activeTab.id);
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="space-y-4">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">One Piece Bar & Tapas</h1>
                <p className="text-sm text-gray-400">Roberto Pastoriza 12</p>
                <p className="text-sm text-gray-400">Santiago de los Caballeros 51000</p>
                <p className="text-sm text-gray-400">Dominican Republic</p>
                <p className="text-sm text-gray-400">(829) 947-7217</p>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{activeTab.customerName}</h3>
                  {activeTab.isFiscal && activeTab.fiscalNumber ? (
                    <p className="text-sm font-medium text-gray-300">RNC: {activeTab.fiscalNumber}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Mesa {activeTab.tableNumber}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {new Date().toLocaleString()}
                  </p>
                  <p className="text-sm font-medium">
                    Método de Pago: {activeTab.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {Object.values(
                  activeTab.items.reduce((acc: { [key: string]: { name: string; quantity: number; price: number; total: number } }, item) => {
                    const menuItem = menuItems.find(m => m.id === item.itemId);
                    if (!menuItem) return acc;

                    if (!acc[menuItem.name]) {
                      acc[menuItem.name] = {
                        name: menuItem.name,
                        quantity: 0,
                        price: menuItem.price,
                        total: 0
                      };
                    }
                    acc[menuItem.name].quantity += item.quantity;
                    acc[menuItem.name].total = acc[menuItem.name].quantity * acc[menuItem.name].price;
                    return acc;
                  }, {})
                ).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>RD${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t border-gray-700 pt-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span>RD${calculateTotals(activeTab).subtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Descuento ({discountPercent}%):</span>
                    <span>-RD${calculateTotals(activeTab).discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300">
                  <span>ITBIS (18%):</span>
                  <span>RD${calculateTotals(activeTab).itbis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Propina (10%):</span>
                  <span>RD${calculateTotals(activeTab).tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                  <span>Total:</span>
                  <span>RD${calculateTotals(activeTab).total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400 pt-4">
                ¡Gracias por su visita!
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && activeTab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Vista Previa del Recibo</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleActualPrint}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setShowPrintPreview(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">One Piece Bar & Tapas</h1>
                <p className="text-sm text-gray-400">Roberto Pastoriza 12</p>
                <p className="text-sm text-gray-400">Santiago de los Caballeros 51000</p>
                <p className="text-sm text-gray-400">Dominican Republic</p>
                <p className="text-sm text-gray-400">(829) 947-7217</p>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{activeTab.customerName}</h3>
                  {activeTab.isFiscal && activeTab.fiscalNumber ? (
                    <p className="text-sm font-medium text-gray-300">RNC: {activeTab.fiscalNumber}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Mesa {activeTab.tableNumber}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {Object.values(
                  activeTab.items.reduce((acc: { [key: string]: { name: string; quantity: number; price: number; total: number } }, item) => {
                    const menuItem = menuItems.find(m => m.id === item.itemId);
                    if (!menuItem) return acc;

                    if (!acc[menuItem.name]) {
                      acc[menuItem.name] = {
                        name: menuItem.name,
                        quantity: 0,
                        price: menuItem.price,
                        total: 0
                      };
                    }
                    acc[menuItem.name].quantity += item.quantity;
                    acc[menuItem.name].total = acc[menuItem.name].quantity * acc[menuItem.name].price;
                    return acc;
                  }, {})
                ).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>RD${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t border-gray-700 pt-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span>RD${calculateTotals(activeTab).subtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Descuento ({discountPercent}%):</span>
                    <span>-RD${calculateTotals(activeTab).discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300">
                  <span>ITBIS (18%):</span>
                  <span>RD${calculateTotals(activeTab).itbis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Propina (10%):</span>
                  <span>RD${calculateTotals(activeTab).tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                  <span>Total:</span>
                  <span>RD${calculateTotals(activeTab).total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400 pt-4">
                ¡Gracias por su visita!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}