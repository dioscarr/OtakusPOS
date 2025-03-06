-- Drop existing tables and functions if they exist
DROP TRIGGER IF EXISTS update_order_totals ON order_items;
DROP FUNCTION IF EXISTS calculate_order_totals();
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP FUNCTION IF EXISTS update_orders_updated_at();
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
DROP FUNCTION IF EXISTS update_menu_items_updated_at();
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Create employees table first
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE COLLATE "C",
  shift_status text CHECK (shift_status IN ('active', 'inactive')) DEFAULT 'inactive',
  cash_in_drawer decimal(10,2) DEFAULT 0,
  shift_start_time timestamptz,
  total_sales decimal(10,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  table_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  itbis decimal(10,2) NOT NULL DEFAULT 0,
  tip decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  is_fiscal boolean NOT NULL DEFAULT false,
  fiscal_number text,
  payment_method text CHECK (payment_method IN ('cash', 'card')),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  food_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX employees_code_idx ON employees(code);
CREATE INDEX menu_items_category_idx ON menu_items(category);
CREATE INDEX orders_employee_id_idx ON orders(employee_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_menu_item_id_idx ON order_items(menu_item_id);

-- Create trigger to update updated_at timestamp for menu items
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- Create trigger to update updated_at timestamp for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Create function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS trigger AS $$
DECLARE
  v_subtotal decimal(10,2);
BEGIN
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Update order totals
  UPDATE orders
  SET 
    subtotal = v_subtotal,
    itbis = v_subtotal * 0.18,
    tip = v_subtotal * 0.10,
    total = v_subtotal * 1.28
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order totals when items change
CREATE TRIGGER update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_totals();

-- Insert initial menu items
INSERT INTO menu_items (name, category, price, description) VALUES
  -- Cocktails
  ('Luffy', 'Cocktails', 12.00, 'A powerful blend worthy of the future Pirate King'),
  ('Shanks', 'Cocktails', 14.00, 'A legendary mix that commands respect'),
  ('Saiyan', 'Cocktails', 13.00, 'Power level over 9000!'),
  ('Kuma', 'Cocktails', 12.00, 'A drink that will send you to paradise'),
  ('Franky', 'Cocktails', 13.00, 'SUPER! energizing cocktail'),
  ('Itadori', 'Cocktails', 12.00, 'Cursed energy in a glass'),
  ('Brook', 'Cocktails', 11.00, 'A soul-warming drink, Yohohoho!'),
  ('AOT', 'Cocktails', 13.00, 'A colossal mix of flavors'),
  ('Zoro', 'Cocktails', 12.00, 'Three-sword style inspired blend'),
  ('Nico', 'Cocktails', 12.00, 'A mysterious and elegant drink'),
  ('Sanji', 'Cocktails', 13.00, 'A perfectly balanced cocktail'),
  ('Naruto', 'Cocktails', 12.00, 'Believe it! A spirited orange blend'),
  ('Gomu Gomu', 'Cocktails', 11.00, 'Stretches your imagination'),
  ('Goku', 'Cocktails', 14.00, 'Ultimate warrior''s drink'),
  ('Ussop', 'Cocktails', 11.00, 'Tales of adventure in a glass'),
  ('Mikasa', 'Cocktails', 12.00, 'Strong and precise blend'),
  ('Ryuk', 'Cocktails', 13.00, 'Deathly delicious apple-based cocktail'),
  ('Nami', 'Cocktails', 12.00, 'Weather-inspired tropical mix'),
  ('Corona', 'Cocktails', 11.00, 'A sunny and refreshing blend'),

  -- Beer
  ('Modelo Rubia', 'Beer', 7.00, 'Classic golden lager'),
  ('Modelo Negra', 'Beer', 7.00, 'Rich dark lager'),
  ('Erdinger Weissbier Rubia', 'Beer', 8.00, 'Traditional German wheat beer'),
  ('Erdinger Weissbier Negra', 'Beer', 8.00, 'Dark German wheat beer'),
  ('Paulaner Weissbier Rubia', 'Beer', 8.00, 'Premium wheat beer'),
  ('8.6 PL', 'Beer', 9.00, 'Strong Polish lager'),
  ('Soju', 'Beer', 8.00, 'Korean rice beer'),

  -- Wine
  ('House Red Wine', 'Wine', 7.00, 'Glass of house red wine'),
  ('House White Wine', 'Wine', 7.00, 'Glass of house white wine'),
  ('Rosé', 'Wine', 8.00, 'Glass of refreshing rosé'),
  ('Sparkling Wine', 'Wine', 9.00, 'Glass of bubbly celebration'),

  -- Spirits
  ('Vodka', 'Spirits', 6.00, 'Premium vodka shot'),
  ('Gin', 'Spirits', 6.00, 'Classic gin shot'),
  ('Rum', 'Spirits', 6.00, 'Caribbean rum shot'),
  ('Tequila', 'Spirits', 6.00, 'Premium tequila shot'),
  ('Whiskey', 'Spirits', 7.00, 'Smooth whiskey shot'),
  ('Bourbon', 'Spirits', 7.00, 'American bourbon shot'),
  ('Scotch', 'Spirits', 8.00, 'Single malt scotch shot'),

  -- Soft Drinks
  ('Coca Cola', 'Soft Drinks', 3.00, 'Classic cola refreshment'),
  ('Water', 'Soft Drinks', 2.00, 'Pure mineral water'),

  -- Food
  ('Lelouch Fries', 'Food', 8.00, 'Strategic blend of seasonings'),
  ('Saitama Gyoza', 'Food', 12.00, 'One punch of flavor'),
  ('Rollitos Choji', 'Food', 10.00, 'Satisfyingly large spring rolls'),
  ('Pollo Natsu', 'Food', 15.00, 'Fire Dragon''s spicy chicken'),
  ('Camarones Asta', 'Food', 16.00, 'Black Bull''s special shrimp'),
  ('Tacos Saiki', 'Food', 13.00, 'Psychically delicious tacos'),
  ('Makima Pollo', 'Food', 14.00, 'Control Devil''s chicken bites'),
  ('Makima Camarones', 'Food', 16.00, 'Control Devil''s shrimp special');

-- Insert initial employees
INSERT INTO employees (name, code)
VALUES 
  ('Luffy', '4530'),
  ('Default Admin', '0000')
ON CONFLICT (code) 
DO UPDATE SET 
  name = EXCLUDED.name;

-- Disable RLS for these tables since we're handling access control at the application level
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON employees TO public;
GRANT ALL ON menu_items TO public;
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;