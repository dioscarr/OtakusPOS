/*
  # Add cash movements tracking

  1. New Tables
    - `cash_movements`
      - `id` (uuid, primary key)
      - `shift_id` (uuid, references shifts)
      - `employee_id` (uuid, references employees)
      - `amount` (decimal) - positive for additions, negative for removals
      - `type` (text) - type of movement (sale, withdrawal, adjustment)
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `cash_movements` table
    - Add policies for authenticated users
*/

-- Create cash_movements table
CREATE TABLE cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id),
  employee_id uuid REFERENCES employees(id),
  amount decimal(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'adjustment')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Policies for cash_movements
CREATE POLICY "Allow authenticated users to read cash movements"
  ON cash_movements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert cash movements"
  ON cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add current_amount column to shift_registers to track running balance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_registers' AND column_name = 'current_amount'
  ) THEN
    ALTER TABLE shift_registers ADD COLUMN current_amount decimal(10,2);
  END IF;
END $$;