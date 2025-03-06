import React, { useState } from 'react';
import { X, DollarSign, ShoppingCart, Clock, AlertTriangle } from 'lucide-react';
import { Employee, Order } from '../types';
import { supabase } from '../lib/supabase';

interface ShiftSummaryModalProps {
  employee: Employee;
  onClose: () => void;
  onConfirm: () => void;
}

export function ShiftSummaryModal({ employee, onClose, onConfirm }: ShiftSummaryModalProps) {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('status', 'pending');

        if (error) throw error;
        setPendingOrders(orders || []);
      } catch (err) {
        console.error('Error fetching pending orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingOrders();
  }, [employee.id]);

  const shiftDuration = employee.shift_start_time 
    ? Math.round((new Date().getTime() - new Date(employee.shift_start_time).getTime()) / (1000 * 60))
    : 0;

  const hours = Math.floor(shiftDuration / 60);
  const minutes = shiftDuration % 60;

  const handleEndShift = () => {
    if (pendingOrders.length > 0) {
      alert('Por favor complete o elimine todas las órdenes pendientes antes de finalizar su turno.');
      return;
    }
    onConfirm();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <p className="text-center">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Finalizar Turno</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {pendingOrders.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Órdenes Pendientes</h3>
            </div>
            <p className="text-sm text-yellow-600">
              Tiene {pendingOrders.length} orden{pendingOrders.length > 1 ? 'es' : ''} pendiente{pendingOrders.length > 1 ? 's' : ''}.
              Por favor complete o elimine todas las órdenes pendientes antes de finalizar su turno.
            </p>
          </div>
        )}

        <div className="space-y-6 mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Duración del Turno</p>
              <p className="font-semibold">
                {hours > 0 ? `${hours}h ` : ''}{minutes}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Total de Órdenes</p>
              <p className="font-semibold">{employee.total_orders || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Total de Ventas</p>
              <p className="font-semibold">RD${employee.total_sales?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Efectivo en Caja</p>
              <p className="font-semibold text-green-600">
                RD${employee.cash_in_drawer?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEndShift}
            disabled={pendingOrders.length > 0}
            className={`flex-1 px-4 py-2 text-white rounded-md transition-colors ${
              pendingOrders.length > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#D80000] hover:bg-[#ff1a1a]'
            }`}
          >
            Finalizar Turno y Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}