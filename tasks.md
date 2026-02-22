# Catalyst Online Store — Feature Specification

## ⚠️ IMPORTANT: Database Safety

> **The database is already in production.** All schema changes MUST use `IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `CREATE TABLE IF NOT EXISTS`. Never drop or rename existing columns/tables. Always test migrations against a backup first. Use transactions for data modifications.

> **After editing or adding anything, always update `globals.md` to reflect the changes.**

---

## Vision

A **React Native mobile app** that serves as a marketplace for all Catalyst-registered companies.
Customers can discover stores, browse products, and place orders — either as guests or registered users.
The platform generates revenue through **ads, banners, and premium store subscriptions**, all managed from the **Admin Panel** (`admin/`).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN PANEL (admin/)                  │
│  Manages: Companies, Plans, Billing, Ads, Banners,      │
│           Premium Stores, Store Categories, App Config   │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  BACKEND    │
                    │  (ASP.NET)  │
                    └──────┬──────┘
               ┌───────────┼───────────┐
               │           │           │
    ┌──────────┴──┐  ┌─────┴─────┐  ┌──┴──────────┐
    │ Company     │  │ Mobile    │  │ Driver/     │
    │ Portal      │  │ App (RN)  │  │ Salesman    │
    │ (company/)  │  │           │  │ Apps        │
    └─────────────┘  └───────────┘  └─────────────┘
```

### Key Principle: Two Access Modes

1. **Marketplace Mode** — Customer opens app → browses store categories → picks a store → shops
2. **Direct Store Mode** — Customer has a link/QR code → goes directly to one store → shops

Both modes share the same app. The difference is just the entry point.

---

## Customer Flows

### Flow 1: Marketplace Discovery

```
App Home
  ├── Search bar (search stores or products globally)
  ├── Banner carousel (paid ads from admin)
  ├── Featured / Premium stores (paid placement)
  ├── Store Categories grid (Supermarket, Electronics, Bakery, Pharmacy, etc.)
  │     └── Tap category → List of stores in that category
  │           ├── Premium stores shown first (gold badge)
  │           ├── Regular stores below
  │           └── Tap store → Store Page (products, cart, checkout)
  ├── Near Me (location-based stores)
  └── Recently Visited stores
```

### Flow 2: Direct Store Access

```
QR Code / Deep Link / Shared URL
  └── Opens directly into Store Page
        ├── Product catalog with categories
        ├── Search & filter
        ├── Add to cart → Checkout
        └── Can also browse "More Stores" from footer
```

### Flow 3: Order Tracking

```
Customer places order
  └── Order Confirmation screen
        ├── Order number, items summary, total
        ├── Estimated delivery time
        └── "Track Order" button

Track Order screen (real-time)
  ├── Status timeline (visual stepper):
  │     ✅ Order Placed          — timestamp
  │     ✅ Confirmed by Store    — timestamp
  │     ✅ Being Prepared        — timestamp
  │     🔄 Out for Delivery      — driver name + phone
  │     ⬜ Delivered
  │
  ├── Live map (if driver app shares location)
  │     └── Driver pin moving toward delivery address
  │
  ├── Driver info card
  │     ├── Driver name + photo
  │     ├── Call driver button
  │     └── Chat / WhatsApp driver
  │
  ├── Order details (expandable)
  │     ├── Items list
  │     ├── Delivery address
  │     └── Payment summary
  │
  └── Actions
        ├── Cancel order (only if status = pending)
        ├── Contact store
        └── Report issue
```

Push notifications at each status change:
- "Your order #123 has been confirmed by [Store Name]"
- "Your order is being prepared"
- "Your order is on the way! Driver: [Name]"
- "Your order has been delivered. Enjoy!"

### Flow 4: Customer Authentication

```
Checkout / Favorites / Order History
  ├── Continue as Guest
  │     └── Enter name + phone + address → Place order
  │           (order linked by phone number, no account)
  │
  └── Create Account / Login
        ├── Phone OTP verification (primary)
        ├── Google / Apple sign-in (optional)
        └── Benefits:
              ├── Saved addresses
              ├── Order history across all stores
              ├── Favorites / wishlist
              ├── Reorder with one tap
              ├── Push notifications for order status
              └── Loyalty points (future)
```

---

## Database Schema — New Tables

### Platform-Level (managed by Admin)

```sql
-- Store categories (Supermarket, Electronics, Bakery, etc.)
CREATE TABLE store_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),           -- Arabic name
    icon VARCHAR(100),              -- icon name or URL
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link companies to store categories (many-to-many)
CREATE TABLE company_store_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_category_id INTEGER NOT NULL REFERENCES store_categories(id) ON DELETE CASCADE,
    UNIQUE(company_id, store_category_id)
);

-- Ads / Banners system
CREATE TABLE ad_placements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,         -- e.g. 'home_banner', 'category_top', 'store_featured'
    description TEXT,
    max_width INTEGER,
    max_height INTEGER,
    price_per_day DECIMAL DEFAULT 0,
    price_per_week DECIMAL DEFAULT 0,
    price_per_month DECIMAL DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    placement_id INTEGER NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
    title VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),              -- deep link to store or product
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    amount_paid DECIMAL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Premium store subscriptions
CREATE TABLE premium_subscriptions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,          -- 'basic', 'premium', 'enterprise'
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    amount DECIMAL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending',
    features JSONB,                     -- {"featured_in_category": true, "priority_search": true, ...}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Customer-Level (mobile app users)

```sql
-- App customers (separate from company-level customers)
CREATE TABLE app_customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(500),         -- null for guest/OTP-only users
    photo_url VARCHAR(500),
    auth_provider VARCHAR(50),          -- 'phone', 'google', 'apple'
    auth_provider_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
    label VARCHAR(50),                  -- 'Home', 'Work', 'Other'
    address TEXT NOT NULL,
    city VARCHAR(100),
    lat DECIMAL,
    lng DECIMAL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Online orders (linked to both app_customer and company)
CREATE TABLE online_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    app_customer_id INTEGER REFERENCES app_customers(id) ON DELETE SET NULL,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_address TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, preparing, delivering, delivered, cancelled
    subtotal DECIMAL DEFAULT 0,
    delivery_fee DECIMAL DEFAULT 0,
    discount DECIMAL DEFAULT 0,
    total DECIMAL DEFAULT 0,
    payment_method VARCHAR(50),         -- 'cod', 'online', 'wallet'
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    notes TEXT,
    delivery_address TEXT,
    delivery_lat DECIMAL,
    delivery_lng DECIMAL,
    estimated_delivery TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE online_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255),
    unit_type VARCHAR(50) DEFAULT 'piece',
    quantity DECIMAL DEFAULT 1,
    unit_price DECIMAL DEFAULT 0,
    total DECIMAL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    notes TEXT
);

-- Favorites
CREATE TABLE app_favorites (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES app_customers(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Companies table — New columns

```sql
ALTER TABLE companies ADD COLUMN store_category_id INTEGER REFERENCES store_categories(id);
ALTER TABLE companies ADD COLUMN is_online_store_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN store_description TEXT;
ALTER TABLE companies ADD COLUMN store_banner_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN store_theme_color VARCHAR(20) DEFAULT '#003366';
ALTER TABLE companies ADD COLUMN delivery_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN delivery_fee DECIMAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN min_order_amount DECIMAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN store_lat DECIMAL;
ALTER TABLE companies ADD COLUMN store_lng DECIMAL;
ALTER TABLE companies ADD COLUMN whatsapp_number VARCHAR(50);
ALTER TABLE companies ADD COLUMN is_premium BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN premium_tier VARCHAR(50);
```

---

## Backend API — New Endpoints

### Public (no auth) — Mobile App

```
GET    /api/marketplace/categories              — list store categories
GET    /api/marketplace/stores?categoryId=&search=&lat=&lng=  — list stores
GET    /api/marketplace/stores/featured          — premium/featured stores
GET    /api/marketplace/banners?placement=       — active ads/banners
POST   /api/marketplace/banners/{id}/click       — track ad click

GET    /api/store/{companyId}/info               — (exists) store info
GET    /api/store/{companyId}/products           — (exists, needs show_in_online_shop filter)
GET    /api/store/{companyId}/categories         — (exists)

POST   /api/app-auth/send-otp                   — send OTP to phone
POST   /api/app-auth/verify-otp                 — verify OTP, return JWT
POST   /api/app-auth/google                     — Google sign-in
POST   /api/app-auth/register                   — create account
```

### Authenticated (app customer JWT)

```
GET    /api/app/profile                          — get profile
PUT    /api/app/profile                          — update profile
GET    /api/app/addresses                        — list saved addresses
POST   /api/app/addresses                        — add address
DELETE /api/app/addresses/{id}                   — remove address

POST   /api/app/orders                           — place order (guest or logged in)
GET    /api/app/orders                           — order history
GET    /api/app/orders/{id}                      — order detail + status

POST   /api/app/favorites                        — add favorite store/product
DELETE /api/app/favorites/{id}                   — remove favorite
GET    /api/app/favorites                        — list favorites
```

### Company Portal — Online Orders Management

```
GET    /api/online-orders?status=                — list online orders for company
PUT    /api/online-orders/{id}/status            — update order status
PUT    /api/online-orders/{id}/assign-driver     — assign delivery driver
GET    /api/online-orders/stats                  — order counts by status
```

### Admin Panel — Monetization Management

```
GET    /api/admin/store-categories               — CRUD store categories
POST   /api/admin/store-categories
PUT    /api/admin/store-categories/{id}
DELETE /api/admin/store-categories/{id}

GET    /api/admin/ad-placements                  — CRUD ad placements
POST   /api/admin/ad-placements
PUT    /api/admin/ad-placements/{id}

GET    /api/admin/ads                            — manage all ads
POST   /api/admin/ads                            — create ad for a company
PUT    /api/admin/ads/{id}                       — update/approve ad
DELETE /api/admin/ads/{id}
GET    /api/admin/ads/revenue                    — ad revenue report

GET    /api/admin/premium-subscriptions          — manage premium subs
POST   /api/admin/premium-subscriptions
PUT    /api/admin/premium-subscriptions/{id}

GET    /api/admin/app-customers                  — view all app users
GET    /api/admin/online-orders                  — view all online orders across companies
GET    /api/admin/analytics                      — platform-wide metrics
```

---

## React Native App — Screen Structure

```
📱 App
├── 🏠 Home (Marketplace)
│     ├── Search bar
│     ├── Banner carousel (ads)
│     ├── Store categories (horizontal scroll)
│     ├── Featured stores (premium)
│     ├── Near me stores
│     └── Recently visited
│
├── 🔍 Search
│     ├── Search stores
│     ├── Search products across stores
│     └── Filter by category, distance, rating
│
├── 🏪 Store Page (per company)
│     ├── Store header (banner, logo, info)
│     ├── Category tabs
│     ├── Product grid
│     ├── Product detail bottom sheet
│     └── Cart button (floating)
│
├── 🛒 Cart
│     ├── Items grouped by store
│     ├── Delivery address selector
│     ├── Order notes
│     ├── Payment method
│     ├── Order summary
│     └── Place Order / WhatsApp checkout
│
├── 📋 Orders
│     ├── Active orders (with live status)
│     ├── Past orders
│     ├── Order detail (items, status timeline, driver info)
│     └── Reorder button
│
├── ❤️ Favorites
│     ├── Favorite stores
│     └── Favorite products
│
└── 👤 Profile
      ├── Guest: Login / Create Account prompt
      ├── Account info
      ├── Saved addresses
      ├── Notification settings
      └── Logout
```

---

## Admin Panel — New Pages

The admin panel (`admin/`) currently has: Dashboard, Companies, Plans, Billing.

### New pages to add:

| Page | Purpose |
|------|---------|
| **Store Categories** | CRUD store categories (Supermarket, Bakery, etc.) with icons/images |
| **Ads Manager** | Create/manage ad placements, view active ads, approve/reject ads |
| **Ad Revenue** | Revenue dashboard — earnings by placement, company, time period |
| **Premium Stores** | Manage premium subscriptions, upgrade/downgrade companies |
| **App Customers** | View registered app users, stats |
| **Online Orders** | Platform-wide order monitoring |
| **Analytics** | Platform metrics: downloads, active users, orders/day, GMV, revenue |
| **Notifications** | Send push notifications to app users (promotions, announcements) |

---

## Company Portal — New Features

### Online Store Settings page (new)
- Enable/disable online store
- Store description, banner image, theme color
- Delivery settings (enabled, fee, min order)
- WhatsApp number for orders
- Store location (map picker)
- Store category selection
- Operating hours

### Online Orders page (new)
- List incoming online orders with status tabs (pending, confirmed, preparing, delivering, delivered)
- Accept/reject orders
- Assign delivery driver
- Real-time notifications for new orders
- Order detail with customer info and delivery address

### Products page (update)
- Toggle `show_in_online_shop` per product (bulk toggle)
- Product images upload (for online display)

---

## Delivery Driver App (`delivery/` — React Native, Separate App)

### Overview

A separate React Native app for delivery drivers. Two types of drivers coexist:

| | **Company Driver** | **Freelance Driver** |
|---|---|---|
| **Works for** | One specific company | The platform (any company) |
| **Added by** | Company via portal | Signs up on the app, approved by admin |
| **Sees orders from** | Only their company | Any company nearby needing delivery |
| **Assigned by** | Company assigns from portal | Driver claims from available pool |
| **Paid by** | Company (salary/per-delivery) | Company pays per delivery (platform manages) |
| **Existing app** | `driver/` (Catalyst ERP driver) | `delivery/` (new app) |

> Note: The existing `driver/` app is for full ERP company drivers (tasks, POS, cash, returns).
> The new `delivery/` app is focused purely on **pickup → deliver** for online orders.

### Three Driver Types

| Type | Description | Managed by |
|------|-------------|------------|
| **Company Driver** | Store's own employee | Store via company portal |
| **Freelance Driver** | Independent individual driver | Platform (admin approves) |
| **Delivery Company** | A fleet business with multiple drivers | Delivery company manager + admin |

A **Delivery Company** is a registered business on the platform. They have:
- A manager account (can be web portal or app section)
- Multiple drivers under their umbrella
- Coverage zones they serve
- Their own dispatch flow (assign orders to their drivers)
- Consolidated earnings, payouts, and performance tracking

When a store requests a platform driver, both **freelance drivers** and **delivery companies** in the area can see the order. A delivery company dispatcher can claim the order and assign it to one of their drivers.

### Database Schema — Delivery Companies

```sql
CREATE TABLE delivery_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(500) NOT NULL,
    logo_url VARCHAR(500),
    license_number VARCHAR(100),
    license_document_url VARCHAR(500),
    coverage_zones JSONB,               -- ["Beirut", "Jounieh", ...]
    fleet_size INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, suspended
    rejection_reason TEXT,
    commission_rate DECIMAL DEFAULT 0,  -- platform takes X% from their deliveries
    rating DECIMAL DEFAULT 5.0,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Freelance drivers can optionally belong to a delivery company:

```sql
ALTER TABLE delivery_drivers ADD COLUMN delivery_company_id INTEGER REFERENCES delivery_companies(id) ON DELETE SET NULL;
ALTER TABLE delivery_drivers ADD COLUMN is_independent BOOLEAN DEFAULT true;
    -- true = freelance, false = works for a delivery company
```

### Delivery Company — Management Features

```
📱 Delivery Company Dashboard (web or app section)
├── 🏠 Overview
│     ├── Active deliveries count
│     ├── Online drivers count
│     ├── Today's completed / earnings
│     └── Live map: all drivers' positions
│
├── 👥 My Drivers
│     ├── Add driver (name, phone, vehicle)
│     ├── Activate / deactivate drivers
│     ├── Driver performance (rating, deliveries, earnings)
│     └── Driver location tracking
│
├── 📋 Available Orders
│     ├── Orders in coverage zones
│     ├── Claim order → assign to a specific driver
│     └── Auto-assign toggle (nearest available driver)
│
├── 🚗 Active Deliveries
│     ├── All in-progress deliveries
│     ├── Live map with all driver positions
│     ├── Reassign if driver has issue
│     └── Contact driver / customer
│
├── 💰 Earnings
│     ├── Total company earnings
│     ├── Per-driver breakdown
│     ├── Platform commission deducted
│     └── Payout history
│
└── ⚙️ Settings
      ├── Company info
      ├── Coverage zones
      ├── Auto-assign rules
      └── Notification preferences
```

### Backend API — Delivery Company Endpoints

```
-- Auth
POST   /api/delivery-company/register            — company registration
POST   /api/delivery-company/login               — login, returns JWT

-- Management (authenticated as delivery company)
GET    /api/delivery-company/drivers              — list company's drivers
POST   /api/delivery-company/drivers              — add a driver
PUT    /api/delivery-company/drivers/{id}         — update/deactivate driver
GET    /api/delivery-company/available-orders     — orders in coverage zones
POST   /api/delivery-company/claim/{orderId}      — claim order for company
PUT    /api/delivery-company/assign/{orderId}     — assign to specific driver
GET    /api/delivery-company/active-deliveries    — all in-progress deliveries
GET    /api/delivery-company/earnings             — company earnings
GET    /api/delivery-company/stats                — performance metrics
GET    /api/delivery-company/profile              — company profile
PUT    /api/delivery-company/profile              — update profile

-- Admin panel
GET    /api/admin/delivery-companies              — list all delivery companies
PUT    /api/admin/delivery-companies/{id}/approve — approve company
PUT    /api/admin/delivery-companies/{id}/reject  — reject company
PUT    /api/admin/delivery-companies/{id}/suspend — suspend company
GET    /api/admin/delivery-companies/{id}/drivers — view company's drivers
GET    /api/admin/delivery-companies/{id}/earnings — company earnings detail
```

### Admin Panel — Delivery Companies Page

| Page | Purpose |
|------|---------|
| **Delivery Companies** | List all delivery companies, approve/reject/suspend, view fleet, earnings |

### Monetization — Delivery Companies

| Revenue Source | Description |
|---------------|-------------|
| **Platform commission** | X% of each delivery fee earned by the delivery company |
| **Monthly subscription** | Optional premium tier for delivery companies (priority order access, analytics) |
| **Fleet management fee** | Per-driver fee for companies above a certain fleet size |

---

### Driver Onboarding (Freelance)

```
Download app → Sign Up
  ├── Name, phone, email
  ├── Upload documents:
  │     ├── National ID (front + back)
  │     ├── Driver's license
  │     └── Vehicle photo
  ├── Select vehicle type: motorcycle, car, bicycle, on-foot
  ├── Select working area (city/zone)
  └── Submit for approval

Admin reviews in admin/ panel:
  ├── Approve → driver can start accepting orders
  ├── Reject → driver notified with reason
  └── Suspend → temporarily disable a driver
```

### Driver App — Screen Structure

```
📱 Delivery App
├── 🔐 Auth
│     ├── Login (phone + password)
│     ├── Register (+ document upload)
│     └── Pending Approval screen
│
├── 🏠 Home
│     ├── Online/Offline toggle (driver availability)
│     ├── Today's summary: deliveries, earnings
│     ├── Current active order (if any)
│     └── Quick stats
│
├── 📋 Available Orders (freelance mode)
│     ├── Sorted by distance (nearest first)
│     ├── Each order card:
│     │     ├── Store name + logo
│     │     ├── Pickup distance ("0.5 km from you")
│     │     ├── Delivery distance ("3.2 km")
│     │     ├── Items count
│     │     ├── Delivery fee earned
│     │     ├── Payment: COD or Prepaid
│     │     └── Time since order placed
│     ├── Accept button → order becomes yours
│     └── Pull to refresh
│
├── 📋 My Orders (company driver mode)
│     ├── Orders assigned by company
│     ├── Same card format
│     └── No "accept" needed — already assigned
│
├── 🚗 Active Delivery (full screen when delivering)
│     ├── Step 1: Navigate to Store
│     │     ├── Map with route
│     │     ├── Store address + phone
│     │     ├── "Arrived at Store" button
│     │     └── Call store button
│     │
│     ├── Step 2: Pickup
│     │     ├── Order items checklist
│     │     ├── "Picked Up" confirmation button
│     │     └── Report issue (missing item, store closed)
│     │
│     ├── Step 3: Navigate to Customer
│     │     ├── Map with route
│     │     ├── Customer address + phone
│     │     ├── Call / WhatsApp customer
│     │     └── "Arrived" button
│     │
│     └── Step 4: Complete Delivery
│           ├── Take delivery photo (proof)
│           ├── If COD: enter cash collected amount
│           ├── "Mark as Delivered" button
│           └── Customer can rate driver (via their app)
│
├── 💰 Earnings
│     ├── Today's earnings
│     ├── This week / this month
│     ├── Delivery history (list of completed deliveries)
│     ├── Per-delivery breakdown: fee, tip, distance
│     └── Payment history (when company/platform paid)
│
├── 📊 Stats
│     ├── Total deliveries
│     ├── Average rating
│     ├── Acceptance rate
│     ├── Completion rate
│     └── Peak hours heatmap
│
└── 👤 Profile
      ├── Personal info
      ├── Vehicle info
      ├── Documents (re-upload if expired)
      ├── Working zones
      ├── Notification settings
      └── Logout
```

### Order Flow — Company Driver

```
Company receives online order
  → Company portal: "Online Orders" page
  → Company clicks "Assign Driver"
  → Selects from their employee drivers
  → Driver gets push notification: "New delivery assigned"
  → Driver sees order in "My Orders" tab
  → Driver follows pickup → deliver flow
  → Company pays driver (salary or per-delivery via payroll)
```

### Order Flow — Freelance Driver

```
Company receives online order
  → Company portal: "Online Orders" page
  → Company clicks "Request Platform Driver"
  → Order goes to freelance pool with delivery fee set by company
  → Nearby online freelance drivers see it in "Available Orders"
  → First driver to accept gets it
  → If no driver accepts in 5 min → company gets notified
  → Driver follows pickup → deliver flow
  → Platform tracks delivery fee owed by company to driver
  → Platform settles payments (weekly/monthly)
```

### Database Schema — Delivery Driver Tables

```sql
-- Freelance delivery drivers (separate from company employees)
CREATE TABLE delivery_drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(500) NOT NULL,
    photo_url VARCHAR(500),
    vehicle_type VARCHAR(50),           -- motorcycle, car, bicycle, on_foot
    vehicle_plate VARCHAR(50),
    id_document_url VARCHAR(500),
    license_url VARCHAR(500),
    vehicle_photo_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, suspended
    rejection_reason TEXT,
    is_online BOOLEAN DEFAULT false,
    current_lat DECIMAL,
    current_lng DECIMAL,
    last_location_update TIMESTAMP,
    city VARCHAR(100),
    working_zones JSONB,                -- ["zone1", "zone2"]
    rating DECIMAL DEFAULT 5.0,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track delivery assignments (both company + freelance)
CREATE TABLE delivery_assignments (
    id SERIAL PRIMARY KEY,
    online_order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    driver_type VARCHAR(20) NOT NULL,   -- 'company' or 'freelance'
    company_driver_id INTEGER,          -- references employees(id) if company driver
    freelance_driver_id INTEGER REFERENCES delivery_drivers(id),
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, accepted, at_store, picked_up, delivering, delivered, cancelled
    delivery_fee DECIMAL DEFAULT 0,
    tip DECIMAL DEFAULT 0,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    delivery_lat DECIMAL,
    delivery_lng DECIMAL,
    distance_km DECIMAL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    delivery_photo_url VARCHAR(500),
    cod_amount_collected DECIMAL DEFAULT 0,
    rating INTEGER,                     -- 1-5 from customer
    rating_comment TEXT
);

-- Driver earnings ledger
CREATE TABLE driver_earnings (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES delivery_assignments(id),
    type VARCHAR(50),                   -- 'delivery_fee', 'tip', 'bonus', 'penalty', 'payout'
    amount DECIMAL NOT NULL,
    balance_after DECIMAL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver payouts (platform pays driver)
CREATE TABLE driver_payouts (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    payout_method VARCHAR(50),          -- 'bank_transfer', 'cash', 'wallet'
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed
    reference VARCHAR(255),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### New columns on `online_orders` table

```sql
ALTER TABLE online_orders ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'pickup';
    -- 'pickup' (customer picks up), 'company_driver', 'freelance_driver'
ALTER TABLE online_orders ADD COLUMN delivery_fee DECIMAL DEFAULT 0;
ALTER TABLE online_orders ADD COLUMN assigned_driver_type VARCHAR(20);
ALTER TABLE online_orders ADD COLUMN assigned_company_driver_id INTEGER;
ALTER TABLE online_orders ADD COLUMN assigned_freelance_driver_id INTEGER;
```

### Backend API — Delivery Driver Endpoints

```
-- Auth
POST   /api/delivery-auth/register              — driver registration + doc upload
POST   /api/delivery-auth/login                 — login, returns JWT
GET    /api/delivery-auth/status                — check approval status

-- Driver actions (authenticated)
PUT    /api/delivery/go-online                  — toggle online/offline
PUT    /api/delivery/location                   — update current GPS position
GET    /api/delivery/available-orders            — nearby orders for freelance pool
POST   /api/delivery/accept/{orderId}           — claim an order
PUT    /api/delivery/orders/{id}/status          — update: at_store, picked_up, delivering, delivered
POST   /api/delivery/orders/{id}/delivery-photo — upload proof of delivery
POST   /api/delivery/orders/{id}/cod-collected  — confirm COD cash amount

GET    /api/delivery/my-orders                  — active + recent orders
GET    /api/delivery/earnings                   — earnings summary + history
GET    /api/delivery/stats                      — performance stats
GET    /api/delivery/profile                    — get profile
PUT    /api/delivery/profile                    — update profile

-- Company portal
GET    /api/online-orders/{id}/request-driver    — post to freelance pool
PUT    /api/online-orders/{id}/assign-company-driver — assign own employee

-- Admin panel
GET    /api/admin/delivery-drivers              — list all drivers
PUT    /api/admin/delivery-drivers/{id}/approve — approve driver
PUT    /api/admin/delivery-drivers/{id}/reject  — reject driver
PUT    /api/admin/delivery-drivers/{id}/suspend — suspend driver
GET    /api/admin/delivery-drivers/{id}/earnings — driver earning details
GET    /api/admin/driver-payouts                — manage payouts
POST   /api/admin/driver-payouts                — process payout
GET    /api/admin/delivery-analytics            — delivery metrics
```

### Admin Panel — New Pages for Delivery

| Page | Purpose |
|------|---------|
| **Delivery Drivers** | List all freelance drivers, approve/reject/suspend, view docs |
| **Driver Payouts** | Process payments to drivers, view pending balances |
| **Delivery Analytics** | Avg delivery time, orders/driver, coverage map, peak hours |

### Company Portal — Delivery Features

- **Online Orders page**: "Assign Company Driver" dropdown + "Request Platform Driver" button
- **Online Store Settings**: Set delivery fee, delivery radius, enable/disable delivery

---

## Monetization Model

### 1. Store Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | Listed in marketplace, basic store page, WhatsApp checkout only |
| **Basic** | $X/mo | Online ordering, order management, delivery tracking, up to 100 products |
| **Premium** | $XX/mo | Featured in category, priority search, analytics, unlimited products, custom branding |
| **Enterprise** | $XXX/mo | Multiple locations, API access, dedicated support, white-label option |

### 2. Advertising

| Placement | Location | Pricing |
|-----------|----------|---------|
| **Home Banner** | Top carousel on app home | $/day or $/week |
| **Category Banner** | Top of category store listing | $/day |
| **Featured Store** | "Featured" section on home + gold badge | $/month |
| **Promoted Product** | Highlighted in store product list | $/week |
| **Search Priority** | Appear first in search results | $/month |

### 3. Transaction Commission (future)
- X% on each online order processed through the platform
- Only when online payment is enabled

---

## Implementation Phases

### Phase 1: Foundation (Backend + Admin) ✅
- [x] DB schema: store_categories, ads, premium_subscriptions, app_customers, online_orders
- [x] Backend: marketplace API, store category CRUD, ad management API
- [x] Backend: app customer auth (phone OTP) — endpoint stubs ready, OTP provider TBD
- [x] Backend: online order endpoints
- [x] Admin: Store Categories page
- [x] Admin: Ads Manager page
- [x] Admin: Premium Stores page
- [x] Company Portal: Online Store Settings page
- [x] Company Portal: Online Orders page
- [x] Company Portal: Product `show_in_online_shop` toggle (individual + bulk "Show All in Store" button)
- [x] Fix existing StoreController to filter by `show_in_online_shop` (with fallback to all active if none marked)
- [x] Fix MarketplaceController to check both `store_category_id` and `company_store_categories` join table
- [x] Fix PremiumController 500 error (materialized query approach)
- [x] Add store category + online store toggle to admin Companies create/edit form
- [x] Backend: `POST /api/products/bulk-online-shop` endpoint for bulk toggling

### Phase 2: React Native App — Core ✅
- [x] Project setup (React Native + Expo) — `onlinestore/` with Expo SDK 54
- [x] Navigation structure (bottom tabs: Home, Categories, Cart, Profile + stack navigators)
- [x] Home screen (marketplace: categories, banners, featured stores)
- [x] Store category listing → stores list (with premium badges)
- [x] Store page (products grid, category filter tabs, search, add to cart)
- [ ] Product detail bottom sheet — deferred to Phase 3
- [x] Cart (add, remove, quantity, multi-store support with per-store checkout)
- [x] Guest checkout (name, phone, address, delivery/pickup toggle)
- [ ] Auth screens (phone OTP login, register) — pending OTP provider integration
- [ ] Direct store deep linking (QR / URL) — pending
- [x] Search screen (live debounced store search)
- [x] Profile screen (guest/user view, menu items)
- [x] Zustand stores (auth + cart with React 19 compatibility)
- [x] API layer (Axios client with platform-aware base URL + auth interceptors)

### Phase 3: React Native App — Full Experience
- [x] Order placement (API integration — fixed StoreController to create OnlineOrder records + inventory deduction)
- [x] Order confirmation screen (success page with order number, status, navigation to detail)
- [x] Order history (phone-based guest lookup with status badges, date/totals)
- [x] Order detail + status tracking (timeline stepper, store info, items, payment summary, cancelled state)
- [x] Saved addresses screen (add/delete modal, labels, default badge — requires auth for API calls)
- [x] Favorites screen (placeholder — requires auth for API calls)
- [x] Backend: AppCustomerController — profile, addresses CRUD, favorites CRUD, authenticated orders
- [x] Backend: Public order lookup endpoints (by-phone, by-id) for guest order tracking
- [x] CheckoutScreen fix — correct API URL + request body field names
- [x] Profile menu wired: My Orders, Favorites, Saved Addresses now navigate to screens
- [x] Near me (geolocation) — expo-location integration, "Near You" section on HomeScreen, backend /stores/nearby endpoint with Haversine distance
- [x] Direct store deep linking (QR / URL) — Catalyst-store:// scheme, NavigationContainer linking config for store/:companyId, orders/:orderId
- [ ] Push notifications (order updates) — pending (requires Expo Notifications + FCM setup)
- [ ] Auth screens (phone OTP login, register) — pending OTP provider integration

### Phase 4: Monetization
- [x] Banner ad display on HomeScreen (auto-scrolling carousel with click tracking)
- [x] Ad impression tracking (auto-increment on banner fetch) & click tracking (POST /banners/{id}/click)
- [x] Premium store badge + featured placement (star badge on HomeScreen/StoreList, featured stores section)
- [x] Admin: Analytics dashboard (/analytics) — platform stats, GMV, orders chart, status breakdown, top stores, ad + premium revenue
- [x] Admin: Ad revenue reports (included in Analytics page + existing AdsManager revenue tab)
- [x] Backend: AnalyticsController — comprehensive platform metrics endpoint
- [ ] Payment integration for subscriptions + ads — pending (Stripe/payment gateway)

### Phase 5: Delivery Driver App
- [x] Project setup (React Native + Expo — `delivery/` project with package.json, app.json, tsconfig, theme, API client, auth store)
- [x] Auth: LoginScreen + RegisterScreen with vehicle selection, pending approval flow
- [x] Home screen: online/offline toggle (with geolocation), today's summary (delivered, earned, active), quick actions, all-time stats
- [x] Available Orders screen: geo-sorted by distance, accept flow with confirmation
- [x] My Orders screen: filter tabs (All/Active/Delivered), order cards with status badges
- [x] Active Delivery flow: OrderDetailScreen with pickup/deliver actions, call store/customer, status updates
- [x] Earnings screen: total/today/week/month breakdowns, recent deliveries list
- [x] Profile screen: driver info, stats, vehicle details, sign out
- [x] Backend: FreelanceDriver model + FreelanceDriverController (register, login, JWT auth, profile, toggle online, location update)
- [x] Backend: available orders (geo-sorted), accept, picked-up, delivered status updates + earnings tracking
- [x] Backend: dashboard + earnings endpoints with period breakdowns
- [x] Backend: FreelanceDriversAdminController (list, detail, approve, reject, suspend, stats)
- [x] App.tsx navigator: AuthStack (Login/Register) + MainTab (Home/Orders/Earnings/Profile) with stack nesting
- [x] Delivery photo proof + COD cash confirmation — DeliveryProofDto, proof_url/cod_collected/cod_amount columns, COD validation in MarkDelivered, delivery confirmation form in OrderDetailScreen
- [ ] Push notifications for new assignments — pending
- [x] Company Portal: "Assign Driver" + "Request Platform Driver" on Online Orders (PUT /online-orders/{id}/assign-driver + /request-driver)
- [x] Admin panel: Delivery Drivers page (list, detail panel, approve/reject/suspend, stats, search/filter)
- [x] Admin: Driver Payouts page — stats cards, searchable table (driver, vehicle, deliveries, earnings, avg/delivery, status), totals row, export CSV button

### Phase 6: Polish
- [x] Rating & reviews system — StoreReview model, ReviewsController (public list/summary/submit + company reply), ReviewsScreen with star picker/breakdown/modal, "Reviews" button on StoreScreen
- [x] Multi-language (i18n) — expo-localization + i18n-js + en/ar/fr translation files + language selector in ProfileScreen with persistent storage
- [x] Dark mode — lightColors/darkColors palettes in theme.ts, useThemeStore (Zustand + AsyncStorage persistence), toggle in ProfileScreen
- [ ] App Store / Play Store submission — pending
- [ ] Performance optimization — pending
- [ ] Offline mode (cached stores/products) — pending
---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Customer App | React Native (Expo) — `onlinestore/` |
| Delivery App | React Native (Expo) — `delivery/` |
| Navigation | React Navigation |
| State | Zustand or Context API |
| HTTP | Axios |
| Push Notifications | Expo Notifications / Firebase FCM |
| Maps | react-native-maps |
| Auth | Phone OTP (Twilio/Firebase Auth) |
| Backend | ASP.NET Core (existing) |
| Database | PostgreSQL (existing) |
| Admin Panel | React + Vite (existing `admin/`) |
| Company Portal | React + Vite (existing `company/`) |
| Image Storage | Cloudinary / S3 / local uploads |
