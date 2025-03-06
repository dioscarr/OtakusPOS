-- Create a minimal receipts table with only essential fields
CREATE TABLE IF NOT EXISTS public.simple_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  receipt_date DATE NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.simple_receipts ENABLE ROW LEVEL SECURITY;

-- Allow inserts and selects
CREATE POLICY "Allow all operations on simple_receipts"
ON public.simple_receipts
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
