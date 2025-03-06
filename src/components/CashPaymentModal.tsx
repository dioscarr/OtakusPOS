import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface CashPaymentModalProps {
  total: number;
  onConfirm: (amountReceived: number) => void;
  onCancel: () => void;
}

export function CashPaymentModal({ total, onConfirm, onCancel }: CashPaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(amountReceived);
    if (!amountReceived || isNaN(amount)) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    if (amount < total) {
      setError('El monto recibido debe ser mayor o igual al total');
      return;
    }

    onConfirm(amount);
  };

  const change = parseFloat(amountReceived) - total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Pago en Efectivo</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total a Pagar
            </label>
            <div className="text-2xl font-bold text-[#D80000]">
              RD${total.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto Recibido
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign size={20} className="text-gray-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min={total}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-xl text-gray-900 bg-white focus:ring-[#D80000] focus:border-[#D80000]"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          {amountReceived && !isNaN(parseFloat(amountReceived)) && parseFloat(amountReceived) >= total && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cambio
              </label>
              <div className="text-2xl font-bold text-green-600">
                RD${change.toFixed(2)}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] transition-colors"
            >
              Completar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}