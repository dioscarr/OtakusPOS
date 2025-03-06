-- Create tabs table
CREATE TABLE tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  table_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  itbis decimal(10,2) NOT NULL DEFAULT 0,
  tip decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  is_fiscal boolean NOT NULL DEFAULT false,
  fiscal_number text,
  payment_method text CHECK (payment_method IN ('cash', 'card')),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create tab items table
CREATE TABLE tab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id uuid REFERENCES tabs(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  served_at timestamptz
);

-- Create indexes
CREATE INDEX tabs_employee_id_idx ON tabs(employee_id);
CREATE INDEX tabs_status_idx ON tabs(status);
CREATE INDEX tab_items_tab_id_idx ON tab_items(tab_id);
CREATE INDEX tab_items_status_idx ON tab_items(status);

-- Enable RLS
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_items ENABLE ROW LEVEL SECURITY;

-- Create policies for tabs
CREATE POLICY "enable_all_tabs"
  ON tabs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for tab_items
CREATE POLICY "enable_all_tab_items"
  ON tab_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON tabs TO public;
GRANT ALL ON tab_items TO public;