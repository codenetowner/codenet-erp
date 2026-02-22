-- Migration: Add employee visibility control
-- Date: 2025-01-20

-- Add visibility restriction columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS restrict_customers BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS restrict_products BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_salesman BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salesman_pin VARCHAR(10);

-- Create employee_customers table for customer visibility assignments
CREATE TABLE IF NOT EXISTS employee_customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, customer_id)
);

-- Create employee_products table for product visibility assignments
CREATE TABLE IF NOT EXISTS employee_products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, product_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_customers_employee ON employee_customers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_customers_customer ON employee_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_employee_products_employee ON employee_products(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_products_product ON employee_products(product_id);
