import React, { useState, useEffect } from 'react';
import { PenSquare, Save, X, ChevronDown, ChevronUp, Upload, Trash2, FileDown, DollarSign, Plus, AlertTriangle, Clipboard, FileScan } from 'lucide-react';
import { MenuItem } from '../types';
import { supabase } from '../lib/supabase';
import { clearAllOrders } from '../lib/orders';
import Tesseract from 'tesseract.js'; // Add Tesseract.js for OCR
import { saveAs } from 'file-saver'; // Add file-saver for saving files
import { OcrProcessor } from './OcrProcessor';
import { OcrInvoicesManager } from './OcrInvoicesManager'; // Dio Rod

interface OperationsPageProps {
  menuItems: MenuItem[];
  onBack: () => void;
}

interface Receipt {
  id: string;
  date: string;
  supplier: string;
  amount: number;
  description: string;
  fileName: string;
}

export function OperationsPage({ 
  menuItems: initialMenuItems 
}: OperationsPageProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'receipts'>('products');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [newReceipt, setNewReceipt] = useState({
    supplier: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems || []);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    category: '',
    price: 0,
    description: ''
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showOcrInvoicesManager, setShowOcrInvoicesManager] = useState(false);

  // Get unique categories from menu items
  const categories = React.useMemo(() => {
    if (!menuItems?.length) return [];
    const uniqueCategories = new Set(
      menuItems
        .filter(item => item && typeof item.category === 'string' && item.category.trim())
        .map(item => item.category)
    );
    return Array.from(uniqueCategories).sort();
  }, [menuItems]);

  useEffect(() => {
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

    return () => {
      menuItemsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'receipts') {
      fetchReceipts();
    }
  }, [activeTab]);

  // Update fetchReceipts to prioritize simple_receipts table
  async function fetchReceipts() {
    try {
      // First try the simple_receipts table
      const { data: simpleReceiptsData, error: simpleError } = await supabase
        .from('simple_receipts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!simpleError && simpleReceiptsData && simpleReceiptsData.length > 0) {
        console.log('Found receipts in simple_receipts table:', simpleReceiptsData.length);
        
        const dbReceipts: Receipt[] = simpleReceiptsData.map((item: any) => ({
          id: item.id,
          date: item.receipt_date,
          supplier: item.supplier,
          amount: item.amount,
          description: item.description || '',
          fileName: item.file_name || ''
        }));
        
        setReceipts(dbReceipts);
        return;
      }
      
      // If no data in simple_receipts, try the expenses table as fallback
      console.log('No data in simple_receipts, trying expenses table');
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');
        
      if (!expensesError && expensesData && expensesData.length > 0) {
        const dbReceipts: Receipt[] = expensesData.map((item: any) => ({
          id: item.id,
          date: item.fecha,
          supplier: item.proveedor,
          amount: item.total,
          description: item.descripcion || '',
          fileName: item.file_url || ''
        }));
        
        setReceipts(dbReceipts);
        return;
      }
      
      // If we reached here, we found no data in either table
      console.log('No receipt data found in any table');
      setReceipts([]);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setReceipts([]);
    }
  }

  const productsByCategory = React.useMemo(() => {
    if (!menuItems?.length) return [];

    const groups: { name: string; items: MenuItem[] }[] = [];
    const validMenuItems = menuItems.filter(item => 
      item && typeof item.category === 'string' && item.category.trim()
    );
    
    const categorySet = new Set(validMenuItems.map(item => item.category));
    
    Array.from(categorySet).sort().forEach(category => {
      const items = validMenuItems.filter(item => item.category === category);
      if (items.length > 0) {
        groups.push({ name: category, items });
      }
    });

    return groups;
  }, [menuItems]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleUpdateProduct = async (product: MenuItem) => {
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: product.name.trim(),
          category: product.category.trim(),
          price: parseFloat(product.price.toString()),
          description: product.description?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      setMenuItems(prev => prev.map(item => 
        item.id === product.id ? { ...item, ...product } : item
      ));
      
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating product:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      setIsProcessing(true);

      if (!newItem.name || !newItem.category || !newItem.price) {
        throw new Error('Please fill in all required fields');
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name: newItem.name.trim(),
          category: newItem.category.trim(),
          price: parseFloat(newItem.price.toString()),
          description: newItem.description?.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setMenuItems(prev => [...prev, data]);
      setNewItem({
        name: '',
        category: '',
        price: 0,
        description: ''
      });
      setIsAddingItem(false);
    } catch (err) {
      console.error('Error adding product:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateNumericField = (value: number, precision: number, scale: number): boolean => {
    const maxValue = Math.pow(10, precision - scale) - Math.pow(10, -scale);
    return Math.abs(value) < maxValue;
  };

  // Simplified to focus on fixing the database insertion first
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // Validate required fields
    if (!newReceipt.supplier || !newReceipt.amount || !newReceipt.date) {
      alert('Por favor complete todos los campos requeridos: Proveedor, Monto y Fecha');
      e.target.value = '';
      return;
    }
  
    try {
      setIsProcessing(true);
      console.log('Starting receipt upload process...');
      
      // Parse amount as a number
      const amount = parseFloat(newReceipt.amount);
      if (isNaN(amount)) {
        throw new Error('El monto debe ser un número válido');
      }

      // Validate numeric fields
      if (!validateNumericField(amount, 12, 2)) {
        throw new Error('El monto excede el límite permitido');
      }
      
      // Generate a unique filename but keep it simple for now
      const fileName = `receipt-${Date.now()}.${file.name.split('.').pop()}`;
      
      // Save the file to disk
      saveAs(file, fileName);
      
      // Insert into the simple_receipts table
      const { error } = await supabase
        .from('simple_receipts')
        .insert({
          supplier: newReceipt.supplier,
          amount: amount,
          description: newReceipt.description || '',
          receipt_date: newReceipt.date,
          file_name: fileName
        });
      
      if (error) {
        console.error('Database insertion failed:', error);
        throw new Error(`Error saving receipt: ${error.message}`);
      }
      
      // Successfully inserted, now create a receipt object for the UI
      const receipt: Receipt = {
        id: Date.now().toString(), // Temporary ID
        date: newReceipt.date,
        supplier: newReceipt.supplier,
        amount: amount,
        description: newReceipt.description || '',
        fileName: fileName
      };
      
      // Add to local state
      setReceipts(prev => [...prev, receipt]);
      
      // Reset form
      setNewReceipt({
        supplier: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Refresh receipts to get latest data including server-generated IDs
      fetchReceipts();
      
      alert('Recibo guardado exitosamente');
      
    } catch (err) {
      console.error('Error saving receipt:', err);
      alert(`Error al guardar el recibo: ${err instanceof Error ? err.message : 'Por favor intente de nuevo'}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      setIsProcessing(true);
      
      // First attempt to delete from simple_receipts table
      const { error: simpleError } = await supabase
        .from('simple_receipts')
        .delete()
        .eq('id', id);
      
      if (simpleError) {
        console.error('Error deleting from simple_receipts:', simpleError);
        
        // If that fails, try deleting from expenses table
        const { error: expensesError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);
        
        if (expensesError) {
          console.error('Error deleting from expenses table:', expensesError);
          throw new Error('Could not delete receipt from database');
        }
      }
      
      // Only update UI if database deletion was successful
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
      
      console.log('Receipt deleted successfully with ID:', id);
    } catch (err) {
      console.error('Error deleting receipt:', err);
      alert(`Error eliminando el recibo: ${err instanceof Error ? err.message : 'Por favor intente de nuevo'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    const filteredReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return receiptDate >= startDate && receiptDate <= endDate;
    });

    const csvContent = [
      ['Date', 'Supplier', 'Amount', 'Description', 'File Name'].join(','),
      ...filteredReceipts.map(receipt =>
        [
          receipt.date,
          receipt.supplier,
          receipt.amount,
          receipt.description,
          receipt.fileName
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receipts_${dateRange.start}_to_${dateRange.end}.csv`;
    link.click();
  };

  const handleClearOrders = async () => {
    try {
      setIsProcessing(true);
      const { success, error } = await clearAllOrders();
      
      if (!success) {
        throw error;
      }

      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing orders:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add this helper function to check if a file is an image
  const isImageFile = (fileName: string): boolean => {
    if (!fileName) return false;
    const lowerCaseName = fileName.toLowerCase();
    return lowerCaseName.endsWith('.jpg') || 
           lowerCaseName.endsWith('.jpeg') || 
           lowerCaseName.endsWith('.png') || 
           lowerCaseName.endsWith('.gif') ||
           lowerCaseName.endsWith('.webp');
  };

  // Function to perform OCR on the uploaded file
  const handleOcr = async () => {
    if (uploadedFile) {
      try {
        const { data: { text } } = await Tesseract.recognize(uploadedFile, 'eng');
        setOcrResult(text);
      } catch (error) {
        console.error('Error performing OCR:', error);
      }
    }
  };

  // Function to copy OCR result to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(ocrResult).then(() => {
      alert('OCR result copied to clipboard');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="w-full px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Operaciones</h1>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            disabled={isProcessing}
          >
            <Trash2 size={20} />
            Limpiar Órdenes
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-[#D80000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'receipts'
                ? 'bg-[#D80000] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Recibos de Operaciones
          </button>
        </div>

        {activeTab === 'products' ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Productos del Menú</h2>
              <button
                onClick={() => setIsAddingItem(true)}
                className="px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] flex items-center gap-2"
              >
                <Plus size={20} />
                Agregar Producto
              </button>
            </div>

            {isAddingItem && (
              <div className="mb-6 bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Agregar Nuevo Producto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                      placeholder="Nombre del producto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="new">+ Nueva Categoría</option>
                    </select>
                    {newItem.category === 'new' && (
                      <input
                        type="text"
                        value=""
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 mt-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        placeholder="Nueva categoría"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Precio *
                    </label>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                      placeholder="Descripción del producto"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setIsAddingItem(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddProduct}
                    disabled={isProcessing || !newItem.name || !newItem.category || !newItem.price}
                    className="px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Agregando...' : 'Agregar Producto'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {productsByCategory.map(({ name: category, items }) => (
                <div key={category} className="bg-gray-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-6 py-3 flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    <h3 className="text-lg font-semibold">{category}</h3>
                    {expandedCategories.has(category) ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  
                  {expandedCategories.has(category) && (
                    <div className="p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-gray-400">
                            <th className="pb-2">Nombre</th>
                            <th className="pb-2">Categoría</th>
                            <th className="pb-2">Precio</th>
                            <th className="pb-2">Descripción</th>
                            <th className="pb-2 w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((product) => (
                            <tr key={product.id} className="border-t border-gray-600">
                              {editingItem?.id === product.id ? (
                                <>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      value={editingItem.name}
                                      onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        name: e.target.value
                                      })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <select
                                      value={editingItem.category}
                                      onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        category: e.target.value
                                      })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                                    >
                                      {categories.map(category => (
                                        <option key={category} value={category}>
                                          {category}
                                        </option>
                                      ))}
                                      <option value="new">+ Nueva Categoría</option>
                                    </select>
                                    {editingItem.category === 'new' && (
                                      <input
                                        type="text"
                                        value=""
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          category: e.target.value
                                        })}
                                        className="w-full px-3 py-2 mt-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                                        placeholder="Nueva categoría"
                                      />
                                    )}
                                  </td>
                                  <td className="py-2">
                                    <input
                                      type="number"
                                      value={editingItem.price}
                                      onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        price: parseFloat(e.target.value) || 0
                                      })}
                                      className="w-32 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <input
                                      type="text"
                                      value={editingItem.description || ''}
                                      onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        description: e.target.value
                                      })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleUpdateProduct(editingItem)}
                                        disabled={isProcessing}
                                        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-600"
                                      >
                                        <Save size={20} />
                                      </button>
                                      <button
                                        onClick={() => setEditingItem(null)}
                                        className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
                                      >
                                        <X size={20} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2">{product.name}</td>
                                  <td className="py-2">{product.category}</td>
                                  <td className="py-2">RD${product.price.toFixed(2)}</td>
                                  <td className="py-2 text-gray-400">{product.description}</td>
                                  <td className="py-2">
                                    <button
                                      onClick={() => setEditingItem(product)}
                                      className="p-2 text-blue-400 hover:text-blue-300"
                                    >
                                      <PenSquare size={20} />
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recibos de Operaciones</h2>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowOcrModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileScan size={20} />
                  OCR de Recibos
                </button>
                {/* New Button to Open OCR Invoices Manager */}
                <button
                  onClick={() => setShowOcrInvoicesManager(true)}
                  className="px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] transition-colors flex items-center gap-2"
                >
                  <FileScan size={20} className="mr-1" />
                  OCR Invoices Manager
                </button>
                <div className="text-lg font-semibold text-[#88BDFD]">
                  Total: RD${receipts.reduce((sum, receipt) => sum + receipt.amount, 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mb-6 bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-white">Exportar Recibos</h3>
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Inicial
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Final
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a]"
                >
                  <FileDown size={20} className="text-white" />
                  Exportar CSV
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={newReceipt.date}
                    onChange={(e) => setNewReceipt(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={newReceipt.supplier}
                    onChange={(e) => setNewReceipt(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Monto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign size={20} className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={newReceipt.amount}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newReceipt.description}
                    onChange={(e) => setNewReceipt(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    placeholder="Descripción del recibo"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] cursor-pointer transition-colors">
                    <Upload size={20} />
                    <span>Subir Recibo</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  onClick={handleOcr}
                  disabled={!uploadedFile}
                  className={`mt-4 px-4 py-2 rounded-md ${uploadedFile ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                >
                  Perform OCR
                </button>
                {ocrResult && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">OCR Result:</h3>
                    <p className="bg-gray-700 p-4 rounded-md mt-2">{ocrResult}</p>
                    <button
                      onClick={handleCopyToClipboard}
                      className="mt-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <Clipboard size={18} />
                      Copy to Clipboard
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 text-white">Recibos Recientes</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="bg-gray-800 p-3 rounded shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{receipt.supplier}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(receipt.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-[#D80000]">
                            RD${receipt.amount.toFixed(2)}
                          </p>
                          {receipt.description && (
                            <p className="text-sm text-gray-400 mt-1">
                              {receipt.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {receipt.fileName ? (
                              receipt.fileName.startsWith('http') ? (
                                isImageFile(receipt.fileName) ? (
                                  <div className="mt-2">
                                    <img 
                                      src={receipt.fileName} 
                                      alt={`Receipt from ${receipt.supplier}`} 
                                      className="w-full max-h-48 object-contain rounded-md border border-gray-600 hover:border-blue-500 transition-colors"
                                      onClick={() => window.open(receipt.fileName, '_blank')}
                                    />
                                    <a 
                                      href={receipt.fileName} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-xs text-blue-500 underline mt-1 block"
                                    >
                                      Ver tamaño completo
                                    </a>
                                  </div>
                                ) : (
                                  <a 
                                    href={receipt.fileName} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-500 underline"
                                  >
                                    Descargar adjunto
                                  </a>
                                )
                              ) : (
                                `Archivo: ${receipt.fileName}`
                              )
                            ) : (
                              'Sin adjunto'
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteReceipt(receipt.id)}
                          disabled={isProcessing}
                          className="text-red-400 hover:text-red-300 disabled:text-gray-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {receipts.length === 0 && (
                    <p className="text-gray-400 text-center py-4">
                      No hay recibos subidos aún
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Confirmar Limpieza</h2>
                  <p className="text-gray-600">
                    ¿Está seguro de que desea eliminar todas las órdenes? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearOrders}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Limpiando...' : 'Confirmar Limpieza'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Add OCR Processor Modal */}
        <OcrProcessor 
          isOpen={showOcrModal} 
          onClose={() => setShowOcrModal(false)} 
        />
        {showOcrInvoicesManager && (
          <OcrInvoicesManager 
            isOpen={true} 
            onClose={() => setShowOcrInvoicesManager(false)} 
          />
        )}
      </main>
    </div>
  );
}