-- Add food_ready column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS food_ready boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS orders_food_ready_idx ON orders(food_ready);

-- Update existing orders to have food_ready set to false
UPDATE orders SET food_ready = false WHERE food_ready IS NULL;

-- Make the column not null after setting default values
ALTER TABLE orders
ALTER COLUMN food_ready SET NOT NULL;