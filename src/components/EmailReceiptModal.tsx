import React, { useState } from 'react';
import { X, Mail, Check, AlertCircle } from 'lucide-react';
import { sendReceiptEmail } from '../lib/emailService';

interface EmailReceiptModalProps {
  customerName: string;
  orderTotal: number;
  onClose: () => void;
}

export function EmailReceiptModal({ customerName, orderTotal, onClose }: EmailReceiptModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Por favor ingrese un correo electrónico');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingrese un correo electrónico válido');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Send email using our email service
      const result = await sendReceiptEmail(email, customerName, orderTotal);
      
      if (!result.success) {
        throw new Error(result.message || 'Error al enviar el recibo');
      }
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Error al enviar el recibo. Por favor intente de nuevo.');
      console.error('Email sending error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Enviar Recibo por Email</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-300" />
            </div>
            <h3 className="text-xl font-semibold text-green-400 mb-2">¡Recibo Enviado!</h3>
            <p className="text-gray-300">
              El recibo ha sido enviado a <span className="text-white font-medium">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-gray-300 mb-4">
                Enviar recibo de <span className="font-semibold text-white">{customerName}</span> por 
                <span className="font-semibold text-white"> RD${orderTotal.toFixed(2)}</span>
              </p>
              
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-[#D80000] focus:border-[#D80000]"
                  placeholder="cliente@ejemplo.com"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                  <AlertCircle size={16} />
                  <p>{error}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Recibo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}