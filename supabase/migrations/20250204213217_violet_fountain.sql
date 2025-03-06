/*
  # Add employee authentication and shift tracking

  1. New Tables
    - `shifts`
      - `id` (uuid, primary key)
      - `start_time` (timestamp)
      - `end_time` (timestamp, nullable)
      - `total_sales` (decimal)
      - `total_orders` (integer)
      - `status` (text)
      - `employee_id` (uuid)
      - `created_at` (timestamp)
    
    - `employees`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `created_at` (timestamp)
    
    - `shift_registers`
      - `id` (uuid, primary key)
      - `shift_id` (uuid, references shifts)
      - `employee_id` (uuid, references employees)
      - `start_amount` (decimal)
      - `end_amount` (decimal)
      - `created_at` (timestamp)
      - `closed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create employees table first
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create shifts table with employee reference
CREATE TABLE shifts (
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
CREATE TABLE shift_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id),
  employee_id uuid REFERENCES employees(id),
  start_amount decimal(10,2) NOT NULL,
  end_amount decimal(10,2),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_registers ENABLE ROW LEVEL SECURITY;

-- Policies for employees
CREATE POLICY "Allow authenticated users to read employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for shifts
CREATE POLICY "Allow authenticated users to read shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM employees WHERE id = shifts.employee_id
  ));

-- Policies for shift_registers
CREATE POLICY "Allow authenticated users to read shift registers"
  ON shift_registers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert shift registers"
  ON shift_registers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their shift registers"
  ON shift_registers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM employees WHERE id = shift_registers.employee_id
  ));

-- Insert sample employees
INSERT INTO employees (name, code) VALUES
  ('John Doe', '1234'),
  ('Jane Smith', '5678'),
  ('Bob Wilson', '9012');