/*
  # Retail Shop Management Schema

  1. Tables
    - Users: Store user information and roles
    - Products: Inventory management
    - Customers: Customer information
    - Sales: Sales transactions
    - Sale Items: Individual items in sales
    - Expenses: Business expenses

  2. Security
    - RLS enabled on all tables
    - Role-based access policies
    - Secure data access control
*/

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'staff'))
);

-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text UNIQUE NOT NULL,
  price decimal NOT NULL CHECK (price >= 0),
  cost decimal NOT NULL CHECK (cost >= 0),
  stock_level integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales table
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  user_id uuid REFERENCES users(id) NOT NULL,
  total_amount decimal NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- Sale items table
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal NOT NULL CHECK (unit_price >= 0),
  subtotal decimal NOT NULL CHECK (subtotal >= 0)
);

-- Expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount decimal NOT NULL CHECK (amount >= 0),
  category text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Products policies
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- Customers policies
CREATE POLICY "All authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers and admins can update customers"
  ON customers FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can delete customers"
  ON customers FOR DELETE
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- Sales policies
CREATE POLICY "All authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only sale creator can update their sales"
  ON sales FOR UPDATE
  USING (auth.uid() = user_id);

-- Sale items policies
CREATE POLICY "All authenticated users can view sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Expenses policies
CREATE POLICY "All authenticated users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage expenses"
  ON expenses FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));