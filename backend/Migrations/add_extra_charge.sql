-- Add extra_charge column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS extra_charge NUMERIC DEFAULT 0;
