-- First disable RLS temporarily
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
DROP POLICY IF EXISTS "receipts_update" ON receipts;
DROP POLICY IF EXISTS "receipt_items_select" ON receipt_items;
DROP POLICY IF EXISTS "receipt_items_insert" ON receipt_items;
DROP POLICY IF EXISTS "receipt_items_update" ON receipt_items;

-- Create new simplified policies for receipts
CREATE POLICY "enable_all_receipts"
  ON receipts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create new simplified policies for receipt_items
CREATE POLICY "enable_all_receipt_items"
  ON receipt_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON receipts TO public;
GRANT ALL ON receipt_items TO public;