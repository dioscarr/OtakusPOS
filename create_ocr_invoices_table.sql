-- Dio Rod
DROP TABLE IF EXISTS ocr_invoices;  -- Dio Rod
CREATE TABLE ocr_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier TEXT NOT NULL,
    rcn TEXT,  -- Dio Rod: new field for RCN
    nif TEXT,  -- Dio Rod: new field for NIF
    date DATE NOT NULL,
    invoice_number TEXT,
    subtotal NUMERIC(12,2) NOT NULL,
    tax NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    payment_type TEXT,  -- Dio Rod: new field for Payment Type
    receipt_image_url TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
