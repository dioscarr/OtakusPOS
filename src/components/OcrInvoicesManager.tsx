import React, { useState, useEffect } from 'react';
import { X, Edit, Save, ArrowRight, Eye, Trash, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Dio Rod

export interface OcrInvoice {
  id: string;
  supplier: string;
  rcn: string | null;
  nif: string | null;
  ncf: string | null;
  date: string;
  invoice_number: string | null;
  subtotal: number;
  tax: number;
  total: number;
  payment_type: string | null;
  receipt_image_url: string | null;
  processed: boolean;
  created_at: string;
}

interface OcrInvoicesManagerProps {
  onClose: () => void;
  isOpen: boolean;
}

export function OcrInvoicesManager({ onClose, isOpen }: OcrInvoicesManagerProps) {
  const [invoices, setInvoices] = useState<OcrInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<OcrInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<OcrInvoice | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState<boolean>(false);
  const [processing, setProcessing] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('supplier'); // default sort
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isRegenerated, setIsRegenerated] = useState(false); // Dio Rod

  // Add helper function for truncation - Dio Rod
  const truncateText = (text: string): string => {
    return text.length > 15 ? text.substring(0, 15) + '..' : text;
  };

  // Fetch all not imported invoices from orc_invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ocr_invoices')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching OCR invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  // Save updates after editing
  const saveInvoice = async () => {
    if (!editingInvoice) return;
    try {
      setProcessing(true);
      // Convert date to ISO format (YYYY-MM-DD)
      const dateObject = new Date(editingInvoice.date);
      const formattedDate = isNaN(dateObject.getTime())
        ? editingInvoice.date
        : dateObject.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('ocr_invoices')
        .update({
          supplier: editingInvoice.supplier,
          rcn: editingInvoice.rcn,
          nif: editingInvoice.nif,
          ncf: editingInvoice.ncf,
          date: formattedDate,  // Updated date field to proper ISO format
          invoice_number: editingInvoice.invoice_number,
          subtotal: editingInvoice.subtotal,
          tax: editingInvoice.tax,
          total: editingInvoice.total,
          payment_type: editingInvoice.payment_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInvoice.id);
      if (error) {
        throw error;
      }
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv));
      setEditingInvoice(null);
    } catch (err) {
      console.error('Error updating invoice:', err);
      alert('Error actualizando la factura OCR.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle importing: open confirmation screen then update record and insert into receipts table
  const importInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      setProcessing(true);
      // Insert into receipts table (adjust fields as needed)
      const { error: receiptError } = await supabase
        .from('simple_receipts')
        .insert([{
          supplier: selectedInvoice.supplier,
          amount: selectedInvoice.total,
          description: `Importada desde OCR: Factura ${selectedInvoice.invoice_number || "N/A"}`,
          receipt_date: selectedInvoice.date,
          file_name: selectedInvoice.receipt_image_url || '',
          rnc: selectedInvoice.rcn || '',
          ncf: selectedInvoice.ncf || '',
          itbis: selectedInvoice.tax,
          forma_pago: selectedInvoice.payment_type || ''
        }]);
      if (receiptError) throw receiptError;
      // Mark as processed
      const { error: updateError } = await supabase
        .from('ocr_invoices')
        .update({ processed: true, updated_at: new Date().toISOString() })
        .eq('id', selectedInvoice.id);
      if (updateError) throw updateError;
      setInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
      setShowImportConfirm(false);
      setSelectedInvoice(null);
      alert('Factura importada exitosamente.');
    } catch (err) {
      console.error('Error importing invoice:', err);
      alert('Error importando la factura. Por favor intente de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  // Sorted invoices based on sortColumn & direction
  const sortedInvoices = React.useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      const valA = (a as any)[sortColumn] || '';
      const valB = (b as any)[sortColumn] || '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [invoices, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleGenerate = () => {
    setIsRegenerated(true);
    // Dio Rod
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {/* Dio Rod */}
            <RefreshCw size={24} className="text-[#D80000]" />
            Facturas OCR Pendientes
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#D80000]"></div>
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400">No hay facturas OCR pendientes de importar.</p>
        ) : (
          // Tabular format with one-line rows and sortable headers
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-700">
              <tr>
                <th onClick={() => handleSort('supplier')} className="py-1 px-2 text-left text-sm font-medium text-white cursor-pointer">
                  Proveedor {sortColumn==='supplier' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('date')} className="py-1 px-2 text-left text-sm font-medium text-white cursor-pointer">
                  Fecha {sortColumn==='date' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('invoice_number')} className="py-1 px-2 text-left text-sm font-medium text-white cursor-pointer">
                  No. Factura {sortColumn==='invoice_number' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('rcn')} className="py-1 px-2 text-left text-sm font-medium text-white cursor-pointer">
                  RCN {sortColumn==='rcn' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('ncf')} className="py-1 px-2 text-left text-sm font-medium text-white cursor-pointer">
                  NCF {sortColumn==='ncf' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('total')} className="py-1 px-2 text-right text-sm font-medium text-white cursor-pointer">
                  Total {sortColumn==='total' ? (sortDirection==='asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-1 px-2 text-center text-sm font-medium text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {sortedInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-600 transition-colors">
                  <td className="py-1 px-2 text-sm text-white truncate whitespace-nowrap" title={inv.supplier}>
                    {truncateText(inv.supplier)}
                  </td>
                  <td className="py-1 px-2 text-sm text-gray-300 truncate whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="py-1 px-2 text-sm text-gray-300 truncate whitespace-nowrap" title={inv.invoice_number || "N/A"}>
                    {truncateText(inv.invoice_number || "N/A")}
                  </td>
                  <td className="py-1 px-2 text-sm text-gray-300 truncate whitespace-nowrap" title={inv.rcn || "N/A"}>
                    {truncateText(inv.rcn || "N/A")}
                  </td>
                  <td className="py-1 px-2 text-sm text-gray-300 truncate whitespace-nowrap" title={inv.ncf || "N/A"}>
                    {truncateText(inv.ncf || "N/A")}
                  </td>
                  <td className="py-1 px-2 text-sm text-right font-medium truncate whitespace-nowrap">
                    RD$ {inv.total.toFixed(2)}
                  </td>
                  <td className="py-1 px-2 truncate whitespace-nowrap">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setEditingInvoice(inv)} className="p-1 bg-green-600 rounded hover:bg-green-700" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1 bg-blue-600 rounded hover:bg-blue-700" title="Ver/Importar">
                        <Eye size={16} />
                      </button>
                      <button onClick={async () => {
                        if (window.confirm('¿Desea eliminar esta factura OCR?')) {
                          try {
                            setProcessing(true);
                            const { error } = await supabase
                              .from('ocr_invoices')
                              .delete()
                              .eq('id', inv.id);
                            if (error) throw error;
                            setInvoices(prev => prev.filter(i => i.id !== inv.id));
                          } catch (err) {
                            console.error(err);
                            alert('Error eliminando la factura.');
                          } finally {
                            setProcessing(false);
                          }
                        }
                      }} className="p-1 bg-red-600 rounded hover:bg-red-700" title="Eliminar">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Edit Modal for manual corrections */}
        {editingInvoice && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Editar Factura OCR</h3>
                <button onClick={() => setEditingInvoice(null)} className="text-gray-400 hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Display form fields with minimal code repetition */}
                <input type="text" value={editingInvoice.supplier} onChange={e => setEditingInvoice({...editingInvoice, supplier: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="Proveedor" />
                <input type="date" value={editingInvoice.date} onChange={e => setEditingInvoice({...editingInvoice, date: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" />
                <input type="text" value={editingInvoice.invoice_number || ''} onChange={e => setEditingInvoice({...editingInvoice, invoice_number: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="No. Factura" />
                <input type="text" value={editingInvoice.rcn || ''} onChange={e => setEditingInvoice({...editingInvoice, rcn: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="RCN" />
                <input type="text" value={editingInvoice.nif || ''} onChange={e => setEditingInvoice({...editingInvoice, nif: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="NIF" />
                <input type="text" value={editingInvoice.ncf || ''} onChange={e => setEditingInvoice({...editingInvoice, ncf: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="NCF" />
                <input type="text" value={editingInvoice.payment_type || ''} onChange={e => setEditingInvoice({...editingInvoice, payment_type: e.target.value})} className="w-full px-3 py-2 bg-gray-600 text-white rounded" placeholder="Forma de Pago" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.01" value={editingInvoice.subtotal} onChange={e => setEditingInvoice({...editingInvoice, subtotal: parseFloat(e.target.value) || 0, total: (parseFloat(e.target.value) || 0) + editingInvoice.tax})} className="w-full px-2 py-2 bg-gray-600 text-white rounded" placeholder="Subtotal" />
                  <input type="number" step="0.01" value={editingInvoice.tax} onChange={e => setEditingInvoice({...editingInvoice, tax: parseFloat(e.target.value) || 0, total: editingInvoice.subtotal + (parseFloat(e.target.value) || 0)})} className="w-full px-2 py-2 bg-gray-600 text-white rounded" placeholder="ITBIS" />
                  <input type="number" step="0.01" value={editingInvoice.total} onChange={e => setEditingInvoice({...editingInvoice, total: parseFloat(e.target.value) || 0})} className="w-full px-2 py-2 bg-gray-600 text-white rounded font-bold" placeholder="Total" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={saveInvoice} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  {processing ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
              <div className="mt-6">
                {/* Large image preview for admin review */}
                {editingInvoice.receipt_image_url ? (
                  <img src={editingInvoice.receipt_image_url} alt="Factura" className="w-full max-h-[70vh] object-contain rounded border border-gray-600" />
                ) : (
                  <p className="text-gray-400">No hay imagen disponible.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail / Import Confirmation Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Detalle e Importación</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white font-semibold">Proveedor:</p>
                  <p className="text-gray-300">{selectedInvoice.supplier}</p>
                  <p className="mt-2 text-white font-semibold">Fecha:</p>
                  <p className="text-gray-300">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                  <p className="mt-2 text-white font-semibold">Factura:</p>
                  <p className="text-gray-300">{selectedInvoice.invoice_number || "N/A"}</p>
                  <p className="mt-2 text-white font-semibold">RCN / NCF:</p>
                  <p className="text-gray-300">{selectedInvoice.rcn || "N/A"} / {selectedInvoice.ncf || "N/A"}</p>
                  <p className="mt-2 text-white font-semibold">NIF:</p>
                  <p className="text-gray-300">{selectedInvoice.nif || "N/A"}</p>
                  <p className="mt-2 text-white font-semibold">Forma de Pago:</p>
                  <p className="text-gray-300">{selectedInvoice.payment_type || "N/A"}</p>
                  <p className="mt-2 text-white font-semibold">Subtotal / ITBIS / Total:</p>
                  <p className="text-gray-300">RD$ {selectedInvoice.subtotal.toFixed(2)} / RD$ {selectedInvoice.tax.toFixed(2)} / RD$ {selectedInvoice.total.toFixed(2)}</p>
                </div>
                <div>
                  <img src={selectedInvoice.receipt_image_url || ''} alt="Imagen de factura" className="w-full max-h-[60vh] object-contain rounded border border-gray-600" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
                  Cancelar
                </button>
                <button onClick={() => setShowImportConfirm(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Importar a Recibos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Confirmation Modal */}
        {showImportConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-70">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Confirmar Importación</h3>
              <p className="text-gray-300 mb-4">
                Revise los datos de la factura OCR y confirme que desea importarla
                al sistema de recibos.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowImportConfirm(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
                  Cancelar
                </button>
                <button onClick={importInvoice} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  {processing ? 'Importando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleGenerate}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${
            isRegenerated ? 'bg-green-600' : 'bg-blue-600'
          }`}
        >
          {/* ...existing regenerate icon or text... */}
        </button>
      </div>
    </div>
  );
}