-- Create storage bucket for receipt files

-- First check if the extension is installed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Then create the bucket for receipts
INSERT INTO storage.buckets (id, name, public)
SELECT 'receipts', 'receipts', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'receipts'
);

-- Set bucket policy to allow public access (be careful with this in production)
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Public Access', 
    '{"name":"Public Access","id":"e4b8caa6-dd33-42c5-9a0f-aac39369bd43","action":"select","buckets":["receipts"],"resources":["*"],"roles":["anon"],"condition":null}',
    'receipts'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'receipts' AND name = 'Public Access'
);

-- Allow uploads for authenticated users
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Upload Access', 
    '{"name":"Upload Access","id":"45066c2c-5e89-4cd0-9184-8058b3ef8726","action":"insert","buckets":["receipts"],"resources":["*"],"roles":["anon"],"condition":null}',
    'receipts'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'receipts' AND name = 'Upload Access'
);
