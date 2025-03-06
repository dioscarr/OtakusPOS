-- First disable RLS temporarily
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "public_access_all_menu_items" ON menu_items;

-- Create new policies for menu items
CREATE POLICY "menu_items_select"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "menu_items_insert"
  ON menu_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "menu_items_update"
  ON menu_items
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "menu_items_delete"
  ON menu_items
  FOR DELETE
  TO public
  USING (true);

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- Re-enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON menu_items TO public;