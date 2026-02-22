-- Add supplier_id column to customers table for linking customers to suppliers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);
