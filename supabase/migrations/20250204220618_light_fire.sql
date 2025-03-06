/*
  # Employee and Shift System Setup

  1. Tables
    - Ensures employees table exists with proper constraints
    - Creates shifts and shift_registers tables
    - Adds necessary indexes
  
  2. Security
    - Enables RLS on all tables
    - Sets up appropriate policies for each table
    
  3. Initial Data
    - Adds Luffy and Default Admin employees
*/

-- Create employees table first
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE COLLATE "C",
  created_at timestamptz DEFAULT now()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS employees_code_idx ON employees (code);

-- Create shifts table with employee reference
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_sales decimal(10,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'closed')),
  employee_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Create shift_registers table
CREATE TABLE IF NOT EXISTS shift_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id),
  employee_id uuid REFERENCES employees(id),
  start_amount decimal(10,2) NOT NULL,
  end_amount decimal(10,2),
  current_amount decimal(10,2),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_registers ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$ 
BEGIN
  -- Employees policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Allow public read access to employees'
  ) THEN
    CREATE POLICY "Allow public read access to employees"
      ON employees
      FOR SELECT
      TO public
      USING (true);
  END IF;

  -- Shifts policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shifts' AND policyname = 'Allow authenticated users to read shifts'
  ) THEN
    CREATE POLICY "Allow authenticated users to read shifts"
      ON shifts
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shifts' AND policyname = 'Allow authenticated users to insert shifts'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert shifts"
      ON shifts
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shifts' AND policyname = 'Allow authenticated users to update their shifts'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their shifts"
      ON shifts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IN (
        SELECT id FROM employees WHERE id = shifts.employee_id
      ));
  END IF;

  -- Shift registers policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shift_registers' AND policyname = 'Allow authenticated users to read shift registers'
  ) THEN
    CREATE POLICY "Allow authenticated users to read shift registers"
      ON shift_registers
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shift_registers' AND policyname = 'Allow authenticated users to insert shift registers'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert shift registers"
      ON shift_registers
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shift_registers' AND policyname = 'Allow authenticated users to update their shift registers'
  ) THEN
    CREATE POLICY "Allow authenticated users to update their shift registers"
      ON shift_registers
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IN (
        SELECT id FROM employees WHERE id = shift_registers.employee_id
      ));
  END IF;
END $$;

-- Insert initial employees including Luffy
INSERT INTO employees (name, code)
VALUES 
  ('Luffy', '4530'),
  ('Default Admin', '0000')
ON CONFLICT (code) 
DO UPDATE SET 
  name = EXCLUDED.name
WHERE employees.code = EXCLUDED.code;