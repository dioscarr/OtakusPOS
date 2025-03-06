/*
  # Fix tables and policies for shifts management

  1. Changes
    - Recreate tables with proper constraints
    - Add necessary indexes
    - Set up proper RLS policies
*/

-- Recreate shifts table with all necessary columns
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_sales decimal(10,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'closed')),
  cash_in_drawer decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS shifts_employee_id_idx ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS shifts_status_idx ON shifts(status);

-- Recreate shift_registers table
CREATE TABLE IF NOT EXISTS shift_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  start_amount decimal(10,2) NOT NULL,
  current_amount decimal(10,2) NOT NULL,
  end_amount decimal(10,2),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create indexes for shift_registers
CREATE INDEX IF NOT EXISTS shift_registers_shift_id_idx ON shift_registers(shift_id);
CREATE INDEX IF NOT EXISTS shift_registers_employee_id_idx ON shift_registers(employee_id);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_registers ENABLE ROW LEVEL SECURITY;

-- Create policies for shifts
CREATE POLICY "Public read access for shifts"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Employees can manage shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for shift_registers
CREATE POLICY "Public read access for shift_registers"
  ON shift_registers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Employees can manage shift_registers"
  ON shift_registers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);