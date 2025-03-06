/*
  # Create menu items table

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `category` (text, not null)
      - `price` (decimal, not null)
      - `description` (text)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `menu_items` table
    - Add policy for authenticated users to read menu items
    - Add policy for admin users to manage menu items
*/

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read menu items
CREATE POLICY "Allow public read access"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated admin users to manage menu items
CREATE POLICY "Allow admin users to manage menu items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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