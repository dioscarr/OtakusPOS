-- Create expenses table for 606 reports

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rnc TEXT NOT NULL,
  tipo_id TEXT DEFAULT '1',
  tipo_bienes TEXT DEFAULT '5',
  ncf TEXT NOT NULL,
  ncf_modificado TEXT,
  fecha DATE NOT NULL,
  fecha_pago DATE,
  monto_servicios DECIMAL(12,2) DEFAULT 0,
  monto_bienes DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  itbis DECIMAL(12,2) DEFAULT 0,
  itbis_retenido DECIMAL(12,2) DEFAULT 0,
  itbis_proporcionalidad DECIMAL(12,2) DEFAULT 0,
  itbis_costo DECIMAL(12,2) DEFAULT 0,
  itbis_adelantar DECIMAL(12,2) DEFAULT 0,
  itbis_percibido DECIMAL(12,2) DEFAULT 0,
  tipo_retencion_isr TEXT,
  monto_retencion_renta DECIMAL(12,2) DEFAULT 0,
  isr_percibido DECIMAL(12,2) DEFAULT 0,
  impuesto_selectivo DECIMAL(12,2) DEFAULT 0,
  otros_impuestos DECIMAL(12,2) DEFAULT 0,
  propina_legal DECIMAL(12,2) DEFAULT 0,
  forma_pago TEXT DEFAULT '03',
  descripcion TEXT,
  proveedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add RLS policies for security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Make sure RLS is enabled
ALTER TABLE public.expenses
  ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to insert rows (use an appropriate role if needed)
CREATE POLICY "Allow inserts to expenses"
ON public.expenses
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to select rows (optional, if you need to read without auth)
CREATE POLICY "Allow select from expenses"
ON public.expenses
FOR SELECT
TO anon
USING (true);

-- Create stored procedure to create this table via RPC (if needed)
CREATE OR REPLACE FUNCTION public.create_expenses_table()
RETURNS void AS $$
BEGIN
  -- This will be empty as the table is created above
  -- But having this function allows calling it via supabase.rpc()
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
