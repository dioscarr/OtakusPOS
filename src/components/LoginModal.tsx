import React, { useState } from 'react';
import { Employee } from '../types';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  onLogin: (employee: Employee) => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Por favor ingrese su código de empleado');
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('employees')
        .select('id, name, code')
        .eq('code', code)
        .limit(1);

      if (queryError) throw queryError;

      if (data && data.length > 0) {
        const employee = data[0];
        onLogin({
          id: employee.id,
          name: employee.name,
          code: employee.code
        });
      } else {
        setError('Código inválido. Por favor intente de nuevo.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Ocurrió un error. Por favor intente de nuevo.');
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: 'url(https://topanimebar.com/wp-content/uploads/2024/08/Top-Anime-Bar-13.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/70"></div>
      
      <div className="relative bg-gray-800/90 backdrop-blur-sm rounded-lg w-full max-w-md border border-gray-700">
        <div className="flex flex-col items-center p-8">
          <img 
            src="https://topanimebar.com/wp-content/uploads/2023/09/TOPAB.svg" 
            alt="TOP Logo" 
            className="w-28 mb-6"
          />
          <h2 className="text-xl font-bold mb-8 text-white">Inicio de Sesión</h2>
        
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Código de Empleado
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-[#D80000] focus:ring-1 focus:ring-[#D80000]"
                placeholder="Ingrese su código"
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-[#ff1a1a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D80000] focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}