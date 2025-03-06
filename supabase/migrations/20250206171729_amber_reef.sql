-- Add insert policies for receipts and receipt items
DROP POLICY IF EXISTS "Public read access for receipts" ON receipts;
DROP POLICY IF EXISTS "Public read access for receipt_items" ON receipt_items;

-- Create comprehensive policies for receipts
CREATE POLICY "receipts_select"
  ON receipts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "receipts_insert"
  ON receipts
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "receipts_update"
  ON receipts
  FOR UPDATE
  TO public
  USING (true);

-- Create comprehensive policies for receipt_items
CREATE POLICY "receipt_items_select"
  ON receipt_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "receipt_items_insert"
  ON receipt_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "receipt_items_update"
  ON receipt_items
  FOR UPDATE
  TO public
  USING (true);

-- Grant necessary permissions
GRANT ALL ON receipts TO public;
GRANT ALL ON receipt_items TO public;