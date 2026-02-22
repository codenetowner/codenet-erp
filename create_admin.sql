INSERT INTO superadmin_users (username, password_hash, name, email, is_active, created_at) 
SELECT 'admin', 'admin123', 'Administrator', 'admin@catalyst.local', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM superadmin_users WHERE username = 'admin');
