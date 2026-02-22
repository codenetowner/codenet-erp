-- Add new employee fields
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_type VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS commission_base VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS minimum_guarantee DECIMAL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS expected_hours_week INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS van_id INTEGER REFERENCES vans(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS use_default_permissions BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS can_access_reports BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS can_approve_deposits BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS can_edit_prices BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS can_edit_credit_limit BOOLEAN DEFAULT false;

-- Update existing employees with default values
UPDATE employees SET salary_type = 'monthly' WHERE salary_type IS NULL;
UPDATE employees SET hourly_rate = 0 WHERE hourly_rate IS NULL;
UPDATE employees SET minimum_guarantee = 0 WHERE minimum_guarantee IS NULL;
UPDATE employees SET expected_hours_week = 0 WHERE expected_hours_week IS NULL;
UPDATE employees SET rating = 5 WHERE rating IS NULL;
UPDATE employees SET use_default_permissions = true WHERE use_default_permissions IS NULL;
UPDATE employees SET can_access_reports = false WHERE can_access_reports IS NULL;
UPDATE employees SET can_approve_deposits = false WHERE can_approve_deposits IS NULL;
UPDATE employees SET can_edit_prices = false WHERE can_edit_prices IS NULL;
UPDATE employees SET can_edit_credit_limit = false WHERE can_edit_credit_limit IS NULL;
