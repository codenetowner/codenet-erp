-- ============================================================
-- Catalyst Complete Database Schema
-- Generated from backend models - Use this to recreate the DB
-- ============================================================

-- 1. PLANS (no dependencies)
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    duration_days INT NOT NULL DEFAULT 30,
    max_customers INT,
    max_employees INT,
    max_drivers INT,
    max_vans INT,
    max_warehouses INT,
    features JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. SUPERADMIN USERS (no dependencies)
CREATE TABLE IF NOT EXISTS superadmin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. COMPANIES (depends on plans)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url VARCHAR(500),
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
    low_stock_alert INT NOT NULL DEFAULT 10,
    max_cash_warning NUMERIC NOT NULL DEFAULT 10000.00,
    exchange_rate NUMERIC NOT NULL DEFAULT 1,
    show_secondary_price BOOLEAN NOT NULL DEFAULT false,
    plan_id INT REFERENCES plans(id),
    plan_expiry_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    store_category_id INT,
    is_online_store_enabled BOOLEAN NOT NULL DEFAULT false,
    store_description TEXT,
    store_banner_url VARCHAR(500),
    store_theme_color VARCHAR(20) DEFAULT '#003366',
    delivery_enabled BOOLEAN NOT NULL DEFAULT false,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC NOT NULL DEFAULT 0,
    store_lat NUMERIC,
    store_lng NUMERIC,
    whatsapp_number VARCHAR(50),
    rating INTEGER NOT NULL DEFAULT 0,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    premium_tier VARCHAR(50),
    page_permissions TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. ROLES (depends on companies)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    permissions JSONB,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. WAREHOUSES (depends on companies)
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    manager_id INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. EMPLOYEES (depends on companies, roles, warehouses)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    role_id INT REFERENCES roles(id),
    photo_url VARCHAR(500),
    is_driver BOOLEAN NOT NULL DEFAULT false,
    is_salesman BOOLEAN NOT NULL DEFAULT false,
    driver_pin VARCHAR(10),
    salesman_pin VARCHAR(10),
    salary_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
    base_pay NUMERIC NOT NULL DEFAULT 0,
    hourly_rate NUMERIC NOT NULL DEFAULT 0,
    commission_rate NUMERIC NOT NULL DEFAULT 0,
    commission_base VARCHAR(50),
    minimum_guarantee NUMERIC NOT NULL DEFAULT 0,
    expected_hours_week INT NOT NULL DEFAULT 0,
    warehouse_id INT REFERENCES warehouses(id),
    van_id INT,
    rating INT NOT NULL DEFAULT 5,
    address TEXT,
    use_default_permissions BOOLEAN NOT NULL DEFAULT true,
    can_access_reports BOOLEAN NOT NULL DEFAULT false,
    can_approve_deposits BOOLEAN NOT NULL DEFAULT false,
    can_edit_prices BOOLEAN NOT NULL DEFAULT false,
    can_edit_credit_limit BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    restrict_customers BOOLEAN NOT NULL DEFAULT false,
    restrict_products BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add manager FK to warehouses now that employees exists
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_manager FOREIGN KEY (manager_id) REFERENCES employees(id);

-- 7. VANS (depends on companies, warehouses, employees)
CREATE TABLE IF NOT EXISTS vans (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    plate_number VARCHAR(50),
    warehouse_id INT REFERENCES warehouses(id),
    assigned_driver_id INT REFERENCES employees(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    max_cash NUMERIC NOT NULL DEFAULT 10000,
    current_cash NUMERIC NOT NULL DEFAULT 0,
    starting_cash NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add van FK to employees now that vans exists
ALTER TABLE employees ADD CONSTRAINT fk_employees_van FOREIGN KEY (van_id) REFERENCES vans(id);

-- 8. PRODUCT CATEGORIES (depends on companies, self-referencing)
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    parent_id INT REFERENCES product_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. PRODUCTS (depends on companies, product_categories, warehouses)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    box_barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    category_id INT REFERENCES product_categories(id),
    image_url VARCHAR(500),
    base_unit VARCHAR(50) NOT NULL DEFAULT 'Piece',
    second_unit VARCHAR(50) DEFAULT 'Box',
    units_per_second INT NOT NULL DEFAULT 1,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    default_warehouse_id INT REFERENCES warehouses(id),
    retail_price NUMERIC NOT NULL DEFAULT 0,
    wholesale_price NUMERIC NOT NULL DEFAULT 0,
    super_wholesale_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    box_retail_price NUMERIC NOT NULL DEFAULT 0,
    box_wholesale_price NUMERIC NOT NULL DEFAULT 0,
    box_super_wholesale_price NUMERIC NOT NULL DEFAULT 0,
    box_cost_price NUMERIC NOT NULL DEFAULT 0,
    low_stock_alert INT NOT NULL DEFAULT 10,
    low_stock_alert_box INT NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_in_online_shop BOOLEAN NOT NULL DEFAULT false,
    color VARCHAR(100),
    size VARCHAR(100),
    weight NUMERIC,
    length NUMERIC,
    height NUMERIC,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9b. PRODUCT VARIANTS (depends on companies, products)
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    retail_price NUMERIC,
    wholesale_price NUMERIC,
    cost_price NUMERIC,
    box_retail_price NUMERIC,
    box_wholesale_price NUMERIC,
    box_cost_price NUMERIC,
    image_url VARCHAR(500),
    color VARCHAR(100),
    size VARCHAR(100),
    weight NUMERIC,
    length NUMERIC,
    height NUMERIC,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. UNITS (depends on companies)
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20),
    symbol VARCHAR(20),
    is_base BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. CURRENCIES (depends on companies)
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
    is_base BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. SUPPLIERS (depends on companies)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    address TEXT,
    payment_terms VARCHAR(100),
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    credit_balance NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_manufacturer BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 13. CUSTOMERS (depends on companies, employees, warehouses, suppliers)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'Retail',
    warehouse_id INT REFERENCES warehouses(id),
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    credit_balance NUMERIC NOT NULL DEFAULT 0,
    debt_balance NUMERIC NOT NULL DEFAULT 0,
    photo_url VARCHAR(500),
    notes TEXT,
    assigned_driver_id INT REFERENCES employees(id),
    visit_frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
    preferred_visit_day VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    supplier_id INT REFERENCES suppliers(id),
    created_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 14. INVENTORY (depends on companies, products, warehouses)
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    product_id INT NOT NULL REFERENCES products(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 15. INVENTORY MOVEMENTS (depends on companies, products, warehouses, vans)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    product_id INT NOT NULL REFERENCES products(id),
    warehouse_id INT REFERENCES warehouses(id),
    van_id INT REFERENCES vans(id),
    movement_type VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_cost NUMERIC,
    reference_type VARCHAR(255),
    reference_id INT,
    notes TEXT,
    created_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 16. VAN INVENTORY (depends on companies, vans, products)
CREATE TABLE IF NOT EXISTS van_inventory (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    van_id INT NOT NULL REFERENCES vans(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity NUMERIC NOT NULL DEFAULT 0,
    loaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 17. VAN CASH (depends on companies, vans, employees)
CREATE TABLE IF NOT EXISTS van_cash (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    van_id INT NOT NULL REFERENCES vans(id),
    driver_id INT REFERENCES employees(id),
    current_balance NUMERIC NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 18. TASKS (depends on companies, customers, employees, vans, warehouses, suppliers)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    task_number VARCHAR(50) NOT NULL DEFAULT '',
    type VARCHAR(50) NOT NULL DEFAULT 'Delivery',
    customer_id INT REFERENCES customers(id),
    driver_id INT REFERENCES employees(id),
    salesman_id INT REFERENCES employees(id),
    van_id INT REFERENCES vans(id),
    warehouse_id INT REFERENCES warehouses(id),
    supplier_id INT REFERENCES suppliers(id),
    scheduled_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    notes TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    extra_charge NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    debt_amount NUMERIC NOT NULL DEFAULT 0,
    payment_type VARCHAR(20) NOT NULL DEFAULT 'cash',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    proof_of_delivery_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INT REFERENCES employees(id)
);

-- 19. TASK ITEMS (depends on tasks, products)
CREATE TABLE IF NOT EXISTS task_items (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(id),
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    product_barcode VARCHAR(100),
    unit_type VARCHAR(50) NOT NULL DEFAULT 'Piece',
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount_percent NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0
);

-- 20. TASK CUSTOMERS (depends on tasks, customers)
CREATE TABLE IF NOT EXISTS task_customers (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    visit_order INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    visited_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 21. ORDERS (depends on companies, customers, employees, vans)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    order_number VARCHAR(50) NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(id),
    driver_id INT REFERENCES employees(id),
    van_id INT REFERENCES vans(id),
    task_id INT REFERENCES tasks(id),
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    order_time TIME,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    order_status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    delivery_address TEXT,
    notes TEXT,
    payment_currencies JSONB,
    exchange_rate_snapshot JSONB,
    location_lat NUMERIC,
    location_lng NUMERIC,
    created_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 22. ORDER ITEMS (depends on orders, products)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    product_barcode VARCHAR(100),
    variant_name VARCHAR(255),
    variant_sku VARCHAR(100),
    variant_details VARCHAR(500),
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    unit_id INT,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'piece',
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL,
    cost_price NUMERIC,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 23. COLLECTIONS (depends on companies, customers, orders, employees)
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    collection_number VARCHAR(50),
    customer_id INT NOT NULL REFERENCES customers(id),
    order_id INT REFERENCES orders(id),
    driver_id INT REFERENCES employees(id),
    task_id INT REFERENCES tasks(id),
    amount NUMERIC NOT NULL,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'cash',
    collection_date TIMESTAMP NOT NULL,
    collection_time TIME,
    check_number VARCHAR(100),
    check_date TIMESTAMP,
    bank_name VARCHAR(255),
    notes TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    is_synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 24. DEPOSITS (depends on companies, employees)
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    deposit_number VARCHAR(50) NOT NULL DEFAULT '',
    driver_id INT NOT NULL REFERENCES employees(id),
    task_id INT REFERENCES tasks(id),
    amount NUMERIC NOT NULL,
    deposit_type VARCHAR(50) NOT NULL DEFAULT 'warehouse',
    deposit_date DATE NOT NULL,
    deposit_time TIME,
    bank_name VARCHAR(255),
    slip_number VARCHAR(100),
    slip_photo_url VARCHAR(500),
    received_by INT REFERENCES employees(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 25. EXPENSE CATEGORIES (depends on companies)
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 26. EXPENSES (depends on companies, expense_categories, employees, vans)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    expense_number VARCHAR(50),
    category_id INT REFERENCES expense_categories(id),
    amount NUMERIC NOT NULL,
    expense_date TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT,
    receipt_url VARCHAR(500),
    employee_id INT REFERENCES employees(id),
    van_id INT REFERENCES vans(id),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    status VARCHAR(50) NOT NULL DEFAULT 'approved',
    approved_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 27. LEADS (depends on companies, employees, customers)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    area VARCHAR(100),
    location_lat NUMERIC,
    location_lng NUMERIC,
    business_type VARCHAR(100),
    estimated_potential TEXT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    captured_by INT NOT NULL REFERENCES employees(id),
    assigned_to INT REFERENCES employees(id),
    converted_customer_id INT REFERENCES customers(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 28. CUSTOMER SPECIAL PRICES (depends on companies, customers, products)
CREATE TABLE IF NOT EXISTS customer_special_prices (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    product_id INT NOT NULL REFERENCES products(id),
    unit_type VARCHAR(50) NOT NULL DEFAULT 'piece',
    special_price NUMERIC NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 29. PRODUCT COST HISTORY (depends on companies, products)
CREATE TABLE IF NOT EXISTS product_cost_history (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    product_id INT NOT NULL REFERENCES products(id),
    supplier_id INT REFERENCES suppliers(id),
    supplier_name VARCHAR(255),
    cost NUMERIC NOT NULL,
    recorded_date TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 30. ATTENDANCES (depends on companies, employees)
CREATE TABLE IF NOT EXISTS attendances (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    employee_id INT NOT NULL REFERENCES employees(id),
    date TIMESTAMP NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    notes VARCHAR(500),
    overtime_hours NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 31. DRIVER SHIFTS (depends on companies, employees, vans, tasks)
CREATE TABLE IF NOT EXISTS driver_shifts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    driver_id INT NOT NULL REFERENCES employees(id),
    van_id INT REFERENCES vans(id),
    task_id INT REFERENCES tasks(id),
    shift_date DATE NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    start_cash NUMERIC NOT NULL DEFAULT 0,
    end_cash NUMERIC NOT NULL DEFAULT 0,
    total_collections NUMERIC NOT NULL DEFAULT 0,
    total_deposits NUMERIC NOT NULL DEFAULT 0,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    customers_visited INT NOT NULL DEFAULT 0,
    customers_skipped INT NOT NULL DEFAULT 0,
    orders_count INT NOT NULL DEFAULT 0,
    new_customers INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 32. QUOTES (depends on companies, customers, employees)
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    quote_number VARCHAR(50) NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(id),
    employee_id INT REFERENCES employees(id),
    quote_date TIMESTAMP NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    converted_order_id INT REFERENCES orders(id),
    converted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 33. QUOTE ITEMS (depends on quotes, products)
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL REFERENCES quotes(id),
    product_id INT NOT NULL REFERENCES products(id),
    unit_id INT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 34. RETURN EXCHANGES (depends on companies, orders, customers, warehouses, employees)
CREATE TABLE IF NOT EXISTS return_exchanges (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    transaction_number VARCHAR(50) NOT NULL,
    original_order_id INT NOT NULL REFERENCES orders(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    cashier_id INT REFERENCES employees(id),
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    return_total NUMERIC NOT NULL DEFAULT 0,
    exchange_total NUMERIC NOT NULL DEFAULT 0,
    net_amount NUMERIC NOT NULL DEFAULT 0,
    refund_method VARCHAR(50),
    refund_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    manager_approval_required BOOLEAN NOT NULL DEFAULT false,
    approved_by INT REFERENCES employees(id),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 35. RETURN EXCHANGE ITEMS (depends on return_exchanges, products, order_items)
CREATE TABLE IF NOT EXISTS return_exchange_items (
    id SERIAL PRIMARY KEY,
    return_exchange_id INT NOT NULL REFERENCES return_exchanges(id),
    item_type VARCHAR(20) NOT NULL DEFAULT 'return',
    product_id INT NOT NULL REFERENCES products(id),
    original_order_item_id INT REFERENCES order_items(id),
    unit_type VARCHAR(20) NOT NULL DEFAULT 'piece',
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL,
    reason VARCHAR(100),
    condition VARCHAR(50),
    inventory_action VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 36. RETURNS (depends on companies, orders, customers, employees)
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    return_number VARCHAR(50) NOT NULL,
    order_id INT REFERENCES orders(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    driver_id INT REFERENCES employees(id),
    return_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by INT REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 37. RETURN ITEMS (depends on returns, products)
CREATE TABLE IF NOT EXISTS return_items (
    id SERIAL PRIMARY KEY,
    return_id INT NOT NULL REFERENCES returns(id),
    product_id INT NOT NULL REFERENCES products(id),
    unit_id INT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 38. PURCHASE ORDERS (depends on companies, suppliers)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    supplier_id INT NOT NULL REFERENCES suppliers(id),
    po_number VARCHAR(50) NOT NULL DEFAULT '',
    po_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_date TIMESTAMP,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    shipping_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    reference VARCHAR(255),
    notes TEXT,
    sent_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    received_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 39. PURCHASE ORDER ITEMS (depends on purchase_orders, products)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INT NOT NULL REFERENCES purchase_orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 40. PURCHASE INVOICES (depends on companies, suppliers)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    supplier_id INT NOT NULL REFERENCES suppliers(id),
    invoice_number VARCHAR(50) NOT NULL DEFAULT '',
    invoice_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date TIMESTAMP,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    shipping_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    shipping_cost NUMERIC NOT NULL DEFAULT 0,
    other_charges NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 41. PURCHASE INVOICE ITEMS (depends on purchase_invoices, products, warehouses)
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id SERIAL PRIMARY KEY,
    purchase_invoice_id INT NOT NULL REFERENCES purchase_invoices(id),
    product_id INT NOT NULL REFERENCES products(id),
    warehouse_id INT REFERENCES warehouses(id),
    unit_id INT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 42. SUPPLIER PAYMENTS (depends on companies, suppliers, purchase_invoices)
CREATE TABLE IF NOT EXISTS supplier_payments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    supplier_id INT NOT NULL REFERENCES suppliers(id),
    payment_number VARCHAR(50) NOT NULL DEFAULT '',
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    method VARCHAR(50) NOT NULL DEFAULT 'Cash',
    amount NUMERIC NOT NULL DEFAULT 0,
    reference VARCHAR(255),
    notes TEXT,
    invoice_id INT REFERENCES purchase_invoices(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 43. EMPLOYEE CUSTOMERS (depends on employees, customers)
CREATE TABLE IF NOT EXISTS employee_customers (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    customer_id INT NOT NULL REFERENCES customers(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 44. EMPLOYEE PRODUCTS (depends on employees, products)
CREATE TABLE IF NOT EXISTS employee_products (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    product_id INT NOT NULL REFERENCES products(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 45. EMPLOYEE PAYMENTS (depends on companies, employees)
CREATE TABLE IF NOT EXISTS employee_payments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    employee_id INT NOT NULL REFERENCES employees(id),
    payment_type VARCHAR(50) NOT NULL DEFAULT 'salary',
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    period_start DATE,
    period_end DATE,
    notes TEXT,
    created_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 46. SYNC QUEUE (depends on companies, employees)
CREATE TABLE IF NOT EXISTS sync_queue (
    id BIGSERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    driver_id INT REFERENCES employees(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    action VARCHAR(50) NOT NULL DEFAULT 'create',
    payload JSONB NOT NULL DEFAULT '{}',
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMP
);

-- 47. INVENTORY SETTINGS (depends on companies)
CREATE TABLE IF NOT EXISTS inventory_settings (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    valuation_method VARCHAR(50) NOT NULL DEFAULT 'fifo',
    cost_spike_threshold NUMERIC NOT NULL DEFAULT 20,
    low_margin_threshold NUMERIC NOT NULL DEFAULT 10,
    enable_cost_alerts BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 48. BILLING (depends on companies, plans)
CREATE TABLE IF NOT EXISTS billing (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    plan_id INT REFERENCES plans(id),
    amount NUMERIC NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    next_renewal_date TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    transaction_reference VARCHAR(255),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 49. RAW MATERIALS (depends on companies)
CREATE TABLE IF NOT EXISTS raw_materials (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit',
    cost_price NUMERIC NOT NULL DEFAULT 0,
    low_stock_alert NUMERIC NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 50. RAW MATERIAL INVENTORY (depends on companies, raw_materials, warehouses)
CREATE TABLE IF NOT EXISTS raw_material_inventory (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    quantity NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 51. RAW MATERIAL PURCHASES (depends on companies, suppliers, employees)
CREATE TABLE IF NOT EXISTS raw_material_purchases (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    purchase_number VARCHAR(50) NOT NULL,
    supplier_id INT REFERENCES suppliers(id),
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(100),
    purchase_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date TIMESTAMP,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    shipping_cost NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    reference VARCHAR(255),
    created_by INT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 52. RAW MATERIAL PURCHASE ITEMS (depends on raw_material_purchases, raw_materials, warehouses)
CREATE TABLE IF NOT EXISTS raw_material_purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INT NOT NULL REFERENCES raw_material_purchases(id),
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 53. PRODUCTION ORDERS (depends on companies, products, warehouses, employees)
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    production_number VARCHAR(50) NOT NULL,
    production_date TIMESTAMP NOT NULL DEFAULT NOW(),
    product_id INT NOT NULL REFERENCES products(id),
    output_quantity NUMERIC NOT NULL DEFAULT 0,
    output_warehouse_id INT NOT NULL REFERENCES warehouses(id),
    raw_material_cost NUMERIC NOT NULL DEFAULT 0,
    extra_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by INT REFERENCES employees(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 54. PRODUCTION ORDER MATERIALS (depends on production_orders, raw_materials, warehouses)
CREATE TABLE IF NOT EXISTS production_order_materials (
    id SERIAL PRIMARY KEY,
    production_order_id INT NOT NULL REFERENCES production_orders(id),
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 55. PRODUCTION ORDER COSTS (depends on production_orders, expenses)
CREATE TABLE IF NOT EXISTS production_order_costs (
    id SERIAL PRIMARY KEY,
    production_order_id INT NOT NULL REFERENCES production_orders(id),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    expense_id INT REFERENCES expenses(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 56. STORE CATEGORIES (no dependencies)
CREATE TABLE IF NOT EXISTS store_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    icon VARCHAR(100),
    image_url VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add FK from companies to store_categories
ALTER TABLE companies ADD CONSTRAINT fk_companies_store_category FOREIGN KEY (store_category_id) REFERENCES store_categories(id);

-- 57. COMPANY STORE CATEGORIES (depends on companies, store_categories)
CREATE TABLE IF NOT EXISTS company_store_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_category_id INT NOT NULL REFERENCES store_categories(id) ON DELETE CASCADE,
    UNIQUE (company_id, store_category_id)
);

-- 58. AD PLACEMENTS (no dependencies)
CREATE TABLE IF NOT EXISTS ad_placements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_width INT NOT NULL DEFAULT 0,
    max_height INT NOT NULL DEFAULT 0,
    price_per_day NUMERIC NOT NULL DEFAULT 0,
    price_per_week NUMERIC NOT NULL DEFAULT 0,
    price_per_month NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 59. ADS (depends on companies, ad_placements)
CREATE TABLE IF NOT EXISTS ads (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    placement_id INT REFERENCES ad_placements(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    impressions INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 60. PREMIUM SUBSCRIPTIONS (depends on companies)
CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'gold',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    features JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 61. APP CUSTOMERS (no dependencies)
CREATE TABLE IF NOT EXISTS app_customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash TEXT,
    photo_url VARCHAR(500),
    auth_provider VARCHAR(50),
    auth_provider_id VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 62. APP CUSTOMER ADDRESSES (depends on app_customers)
CREATE TABLE IF NOT EXISTS app_customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
    label VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100),
    lat NUMERIC,
    lng NUMERIC,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 63. ONLINE ORDERS (depends on companies, app_customers, employees)
CREATE TABLE IF NOT EXISTS online_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50),
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    app_customer_id INT REFERENCES app_customers(id) ON DELETE SET NULL,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    delivery_address TEXT,
    delivery_lat NUMERIC,
    delivery_lng NUMERIC,
    estimated_delivery TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    delivery_type VARCHAR(50) NOT NULL DEFAULT 'delivery',
    assigned_driver_type VARCHAR(50),
    assigned_company_driver_id INT REFERENCES employees(id) ON DELETE SET NULL,
    assigned_freelance_driver_id INT,
    delivery_proof_url VARCHAR(500),
    cod_collected BOOLEAN NOT NULL DEFAULT false,
    cod_amount NUMERIC NOT NULL DEFAULT 0,
    picked_up_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 64. ONLINE ORDER ITEMS (depends on online_orders, products)
CREATE TABLE IF NOT EXISTS online_order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'piece',
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    notes TEXT
);

-- 65. APP FAVORITES (depends on app_customers, companies, products)
CREATE TABLE IF NOT EXISTS app_favorites (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 66. DELIVERY COMPANIES (no dependencies)
CREATE TABLE IF NOT EXISTS delivery_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    address VARCHAR(500),
    logo_url VARCHAR(500),
    contact_person VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 67. FREELANCE DRIVERS (depends on delivery_companies)
CREATE TABLE IF NOT EXISTS freelance_drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    photo_url VARCHAR(500),
    id_document_url VARCHAR(500),
    license_url VARCHAR(500),
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'car',
    vehicle_plate VARCHAR(50),
    vehicle_color VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_online BOOLEAN NOT NULL DEFAULT false,
    current_lat NUMERIC,
    current_lng NUMERIC,
    rating NUMERIC NOT NULL DEFAULT 5.0,
    total_deliveries INT NOT NULL DEFAULT 0,
    total_earnings NUMERIC NOT NULL DEFAULT 0,
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    delivery_company_id INT REFERENCES delivery_companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add FK from online_orders to freelance_drivers
ALTER TABLE online_orders ADD CONSTRAINT fk_online_orders_freelance_driver
    FOREIGN KEY (assigned_freelance_driver_id) REFERENCES freelance_drivers(id) ON DELETE SET NULL;

-- 68. STORE REVIEWS (depends on companies, app_customers, online_orders)
CREATE TABLE IF NOT EXISTS store_reviews (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    app_customer_id INT REFERENCES app_customers(id) ON DELETE SET NULL,
    order_id INT REFERENCES online_orders(id) ON DELETE SET NULL,
    guest_name VARCHAR(255),
    rating INT NOT NULL,
    comment TEXT,
    reply TEXT,
    replied_at TIMESTAMP,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 69. CHART OF ACCOUNTS (depends on companies)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    category VARCHAR(100),
    parent_id INT REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- 70. JOURNAL ENTRIES (depends on companies)
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- order, expense, supplier_invoice, supplier_payment, collection, deposit, salary, production, return, manual
    reference_id INT,
    total_debit NUMERIC NOT NULL DEFAULT 0,
    total_credit NUMERIC NOT NULL DEFAULT 0,
    is_posted BOOLEAN NOT NULL DEFAULT false,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversed_by_id INT REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, entry_number)
);

-- 71. JOURNAL ENTRY LINES (depends on journal_entries, chart_of_accounts)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC NOT NULL DEFAULT 0,
    credit NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SIDEBAR CUSTOMIZATION
-- ============================================================

-- 72. SIDEBAR SECTIONS (depends on companies)
CREATE TABLE IF NOT EXISTS sidebar_sections (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 73. SIDEBAR PAGE ASSIGNMENTS (depends on companies, sidebar_sections)
CREATE TABLE IF NOT EXISTS sidebar_page_assignments (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    section_id INT NOT NULL REFERENCES sidebar_sections(id) ON DELETE CASCADE,
    page_id VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DEFAULT SUPERADMIN (password: admin123)
-- ============================================================
INSERT INTO superadmin_users (username, password_hash, name, is_active)
VALUES ('admin', '$2a$11$rICH3lMRBxAPOsjCAqVLce1wv6WMZ/FERuuPe.mfJmHw7YMPnqSei', 'Super Admin', true)
ON CONFLICT DO NOTHING;
