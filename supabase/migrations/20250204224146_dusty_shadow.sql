-- Drop existing tables if they exist
DROP TABLE IF EXISTS cash_movements CASCADE;
DROP TABLE IF EXISTS shift_registers CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;

-- Recreate shifts table
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_sales decimal(10,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'closed')),
  created_at timestamptz DEFAULT now()
);

-- Recreate shift_registers table
CREATE TABLE shift_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  start_amount decimal(10,2) NOT NULL,
  current_amount decimal(10,2) NOT NULL,
  end_amount decimal(10,2),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Recreate cash_movements table
CREATE TABLE cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('sale', 'withdrawal', 'adjustment')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Disable RLS for these tables
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_registers DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements DISABLE ROW LEVEL SECURITY;