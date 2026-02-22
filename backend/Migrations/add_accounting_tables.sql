-- Accounting Module Migration
-- SAFE: Creates NEW tables only. No ALTER on existing tables. No data loss risk.
-- Run this on your production database before deploying the new code.

-- 1. Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    parent_id INT REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_chart_of_accounts_company_id_code 
    ON chart_of_accounts(company_id, code);

-- 2. Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id INT,
    total_debit NUMERIC NOT NULL DEFAULT 0,
    total_credit NUMERIC NOT NULL DEFAULT 0,
    is_posted BOOLEAN NOT NULL DEFAULT false,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversed_by_id INT REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_journal_entries_company_id_entry_number 
    ON journal_entries(company_id, entry_number);

-- 3. Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC NOT NULL DEFAULT 0,
    credit NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS ix_journal_entries_company_date 
    ON journal_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS ix_journal_entries_reference 
    ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS ix_journal_entry_lines_account 
    ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS ix_journal_entry_lines_entry 
    ON journal_entry_lines(journal_entry_id);
