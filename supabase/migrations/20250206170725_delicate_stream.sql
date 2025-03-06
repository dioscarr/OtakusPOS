-- Create receipts table
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
  created_at timestamptz DEFAULT now()
);

-- Create receipt_items table
CREATE TABLE receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX receipts_employee_id_idx ON receipts(employee_id);
CREATE INDEX receipts_created_at_idx ON receipts(created_at);
CREATE INDEX receipt_items_receipt_id_idx ON receipt_items(receipt_id);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for receipts"
  ON receipts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for receipt_items"
  ON receipt_items
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT ALL ON receipts TO public;
GRANT ALL ON receipt_items TO public;