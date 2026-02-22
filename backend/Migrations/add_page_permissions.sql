-- Add page_permissions column to companies table
-- This stores a JSON array of allowed page paths (null = all pages allowed)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS page_permissions TEXT;

-- Example: To restrict a company to only dashboard, employees, and products:
-- UPDATE companies SET page_permissions = '["dashboard","employees","products"]' WHERE id = 1;
