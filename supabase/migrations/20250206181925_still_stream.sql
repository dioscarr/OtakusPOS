-- First, drop existing tables if they exist
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;

-- Create receipts table with proper structure
CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  table_number integer NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  itbis decimal(10,2) NOT NULL,
  tip decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card')),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create receipt_items table with proper structure
CREATE TABLE receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX receipts_employee_id_idx ON receipts(employee_id);
CREATE INDEX receipts_created_at_idx ON receipts(created_at);
CREATE INDEX receipt_items_receipt_id_idx ON receipt_items(receipt_id);
CREATE INDEX receipt_items_menu_item_id_idx ON receipt_items(menu_item_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_updated_at();

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for receipts
CREATE POLICY "receipts_policy"
  ON receipts
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for receipt_items
CREATE POLICY "receipt_items_policy"
  ON receipt_items
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON receipts TO public;
GRANT ALL ON receipt_items TO public;