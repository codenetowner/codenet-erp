-- Add salesman_id column to tasks table for assigning visit tasks to salesmen
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS salesman_id INTEGER REFERENCES employees(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_salesman_id ON tasks(salesman_id);
