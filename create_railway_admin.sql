-- Create superadmin user for Railway database
INSERT INTO superadmin_users (username, password_hash, name, email, is_active, created_at) 
SELECT 'admin', 'admin123', 'Administrator', 'admin@codenet.software', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM superadmin_users WHERE username = 'admin');
