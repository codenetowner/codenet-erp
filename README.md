# Catalyst ERP — Sales, Distribution & Marketplace Platform

A comprehensive multi-portal ERP system for van sales operations, B2B distribution, and B2C online marketplace — with integrated delivery fleet management.

## Team

| Name | Role |
|------|------|
| **Ali Shanboura** | Developer |
| **Ahmad Mousa** | Developer |

---

## System Architecture & Full Business Lifecycle

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    Catalyst ERP PLATFORM                                        ║
║                        8 Portals  ·  1 API  ·  71 DB Tables  ·  5 JWT Roles                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝


══════════════════════════════════════════════════════════════════════════════════════════════════════
 PHASE 1: PLATFORM SETUP                                           Managed by: Super Admin
══════════════════════════════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────┐
                              │     👤 SUPER ADMIN            │
                              │     Admin Portal :5176        │
                              │     (React + Vite)            │
                              │                              │
                              │  • Create companies & plans  │
                              │  • Manage store categories   │
                              │  • Manage ads & banners      │
                              │  • Manage premium tiers      │
                              │  • Approve freelance drivers │
                              │  • View platform analytics   │
                              │  • Monitor driver payouts    │
                              │  • View all orders & users   │
                              └──────────────┬───────────────┘
                                             │
                          Creates companies, sets plans, approves drivers
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                       ▼                       ▼
         ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
         │   Company A     │     │   Company B     │     │   Company C     │
         │   (Supermarket) │     │   (Bakery)      │     │   (Electronics) │
         └─────────────────┘     └─────────────────┘     └─────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════════════
 PHASE 2: BUSINESS OPERATIONS                                     Managed by: Store Owner
══════════════════════════════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────┐
                              │     🏢 STORE OWNER            │
                              │     Company Portal :3000      │
                              │     (React + Vite)            │
                              │                              │
                              │  • Add products & categories │
                              │  • Manage employees (roles)  │
                              │  • Manage B2B customers      │
                              │  • Warehouses & vans         │
                              │  • Multi-currency pricing    │
                              │  • Direct sales (POS)        │
                              │  • Invoices & returns        │
                              │  • Online store settings     │
                              │  • Manage online orders      │
                              │  • Assign delivery drivers   │
                              └──────┬──────────────┬────────┘
                                     │              │
                   Assigns routes    │              │  Assigns deliveries
                   & customers       │              │
                     ┌───────────────┘              └───────────────┐
                     ▼                                              ▼
         ┌─────────────────────┐                      ┌─────────────────────┐
         │  👔 SALESMAN         │                      │  🚗 COMPANY DRIVER   │
         │  Salesman Portal     │                      │  Driver Portal       │
         │  :5175               │                      │  :5174               │
         │  (React + Vite)      │                      │  (React + Vite)      │
         │                     │                      │                     │
         │  • View daily routes │                      │  • View assigned    │
         │  • Visit customers  │                      │    delivery routes  │
         │  • Place B2B orders │                      │  • Manage company   │
         │  • Collect payments │                      │    deliveries       │
         └─────────────────────┘                      └─────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════════════
 PHASE 3: CONSUMER SHOPPING                                       Used by: End Consumers
══════════════════════════════════════════════════════════════════════════════════════════════════════

         ┌──────────────────────────────────────────────────────────────┐
         │     📱 CONSUMER (Shopper)                                    │
         │     Online Store App :8081                                   │
         │     (React Native / Expo — iOS, Android, Web)               │
         │                                                             │
         │  • Browse marketplace categories & stores                   │
         │  • Discover nearby stores (geolocation)                     │
         │  • Search stores & products                                 │
         │  • Add to cart & checkout (guest or registered)             │
         │  • Choose delivery or pickup                                │
         │  • Track orders (by phone or account)                       │
         │  • Rate & review stores                                     │
         │  • Favorites & saved addresses                              │
         │  • Multi-language (EN, AR, FR) · Dark mode                  │
         │  • Deep linking: Catalyst-store://store/{id}                 │
         └────────────────────────┬─────────────────────────────────────┘
                                  │
                          Places an order
                                  │
                                  ▼

══════════════════════════════════════════════════════════════════════════════════════════════════════
 PHASE 4: ORDER LIFECYCLE                                         Cross-portal flow
══════════════════════════════════════════════════════════════════════════════════════════════════════

  Consumer               Store Owner              Store Owner              Driver
  Online Store App       Company Portal :3000     Company Portal :3000     Delivery App :8082
       │                      │                        │                       │
       │   ┌──────────┐       │   ┌──────────┐         │   ┌──────────┐        │   ┌──────────┐
       └──▶│ PENDING  │──────▶└──▶│CONFIRMED │────────▶└──▶│PREPARING │───────▶└──▶│DELIVERING│
            └──────────┘           └──────────┘             └──────────┘            └─────┬────┘
             Order created          Owner accepts            Items ready                  │
             in database            the order                for dispatch           Driver picks up
                                                                  │                      │
                                                                  │                      ▼
                                                    Assigns driver│               ┌──────────┐
                                                    (3 options)   │               │DELIVERED │
                                                                  │               └──────────┘
                                                                  │                Proof photo
                                                                  │                COD collected
                                                                  │                Earnings credited
                                                                  ▼
                                               ┌─────────────────────────────┐
                                               │  DRIVER ASSIGNMENT OPTIONS  │
                                               ├─────────────────────────────┤
                                               │                             │
                                               │  Option A: Company Driver   │
                                               │  └▶ Driver Portal :5174     │
                                               │     (company employee)      │
                                               │                             │
                                               │  Option B: Freelance Driver │
                                               │  └▶ Delivery App :8082      │
                                               │     (independent, approved  │
                                               │      by admin)              │
                                               │                             │
                                               │  Option C: Fleet Driver     │
                                               │  └▶ Delivery App :8082      │
                                               │     (belongs to a delivery  │
                                               │      company)               │
                                               └─────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════════════
 PHASE 5: DELIVERY OPERATIONS                                     Used by: Drivers & Fleet Managers
══════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌───────────────────────────────────┐          ┌───────────────────────────────────┐
  │  🛵 FREELANCE DRIVER               │          │  🏭 DELIVERY COMPANY               │
  │  Delivery App :8082                │          │  Delivery Portal :8083 (desktop)  │
  │  (React Native / Expo)            │          │  Delivery App :8082 (mobile)      │
  │                                   │          │  (React + Vite / React Native)    │
  │  • Register (pending approval)    │          │                                   │
  │  • Go online / offline + GPS      │          │  • Register delivery company      │
  │  • View available orders          │          │  • Add / remove drivers           │
  │    (geo-sorted by distance)       │          │  • Suspend / activate drivers     │
  │  • Accept order                   │          │  • View all fleet orders          │
  │  • Pick up from store             │          │  • Dashboard: drivers online,     │
  │  • Deliver to customer            │          │    active orders, revenue         │
  │  • Confirm COD cash collection    │          │  • Monitor fleet performance      │
  │  • Upload delivery proof photo    │          │                                   │
  │  • View earnings & history        │          │  Fleet drivers appear in the      │
  │                                   │          │  Delivery App as freelance        │
  │  Driver Mode ← toggle → Company  │          │  drivers linked to this company   │
  │                          Mode     │          │                                   │
  └───────────────────────────────────┘          └───────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════════════
 BACKEND: SHARED API                                               All portals connect here
══════════════════════════════════════════════════════════════════════════════════════════════════════

  All 8 portals
       │
       ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                            │
  │                          .NET 8 REST API  ·  http://localhost:5227                         │
  │                                                                                            │
  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
  │   │ Marketplace │ │  Company    │ │  Freelance  │ │  Delivery   │ │  SuperAdmin │         │
  │   │ Controller  │ │ Controllers │ │  Driver     │ │  Company    │ │ Controllers │         │
  │   │             │ │             │ │ Controller  │ │ Controller  │ │             │         │
  │   │ /marketplace│ │ /products   │ │ /freelance  │ │ /delivery-  │ │ /admin/*    │         │
  │   │ /store      │ │ /orders     │ │             │ │  company    │ │             │         │
  │   │ /app        │ │ /employees  │ │ register    │ │             │ │ analytics   │         │
  │   │             │ │ /invoices   │ │ login       │ │ register    │ │ companies   │         │
  │   │ categories  │ │ /customers  │ │ available   │ │ login       │ │ store-cats  │         │
  │   │ stores      │ │ /online-    │ │ accept      │ │ drivers     │ │ ads         │         │
  │   │ reviews     │ │  orders     │ │ pickup      │ │ orders      │ │ premium     │         │
  │   │ banners     │ │ /online-    │ │ deliver     │ │ dashboard   │ │ drivers     │         │
  │   │ nearby      │ │  store-     │ │ earnings    │ │ toggle      │ │ payouts     │         │
  │   │             │ │  settings   │ │ location    │ │             │ │ customers   │         │
  │   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │
  │                                                                                            │
  │   ┌──────────────────────────────────────────────────────────────────────────────┐         │
  │   │                        JWT AUTHENTICATION                                    │         │
  │   │                                                                              │         │
  │   │   SuperAdmin ─────────────▶ Admin Portal                                     │         │
  │   │   Employee (company_id) ──▶ Company Portal, Salesman Portal, Driver Portal   │         │
  │   │   AppCustomer ────────────▶ Online Store App                                 │         │
  │   │   FreelanceDriver ────────▶ Delivery App (driver mode)                       │         │
  │   │   DeliveryCompany ────────▶ Delivery App (company mode), Delivery Portal     │         │
  │   └──────────────────────────────────────────────────────────────────────────────┘         │
  │                                                                                            │
  └──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │   PostgreSQL DB      │
                                  │   71 tables          │
                                  │                      │
                                  │   companies          │
                                  │   products           │
                                  │   orders             │
                                  │   online_orders      │
                                  │   app_customers      │
                                  │   freelance_drivers  │
                                  │   delivery_companies │
                                  │   store_categories   │
                                  │   currencies         │
                                  │   store_reviews      │
                                  │   ads / placements   │
                                  │   premium_subs       │
                                  │   chart_of_accounts  │
                                  │   journal_entries    │
                                  │   journal_entry_lines│
                                  │   ...and 56 more     │
                                  └─────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════════════
 PORTAL SUMMARY
══════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌──────────────────┬───────┬────────────────┬────────────────────────────────────────────────┐
  │ Portal           │ Port  │ Stack          │ Who Uses It                                    │
  ├──────────────────┼───────┼────────────────┼────────────────────────────────────────────────┤
  │ Admin Portal     │ 5176  │ React+Vite     │ Platform super admins                          │
  │ Company Portal   │ 3000  │ React+Vite     │ Store owners & managers                        │
  │ Salesman Portal  │ 5175  │ React+Vite     │ Field sales representatives                    │
  │ Driver Portal    │ 5174  │ React+Vite     │ Company employee drivers                       │
  │ Delivery Portal  │ 8083  │ React+Vite     │ Delivery company fleet managers                │
  │ Online Store App │ 8081  │ RN/Expo        │ End consumers (iOS, Android, Web)              │
  │ Delivery App     │ 8082  │ RN/Expo        │ Freelance drivers & delivery company (mobile)  │
  │ Backend API      │ 5227  │ .NET 8         │ All portals connect here                       │
  └──────────────────┴───────┴────────────────┴────────────────────────────────────────────────┘
```

---

## Portal Details

### 1. Admin Portal — `admin/` (port 5176)
**Role:** `SuperAdmin`

| Feature | Description |
|---------|-------------|
| Companies | Create, edit, suspend companies. Assign plans. |
| Store Categories | CRUD marketplace categories (Supermarket, Bakery, etc.) |
| Ads Manager | Ad placements, banners, impression/click tracking, revenue |
| Premium Stores | Subscription tiers, auto-sync to company premium status |
| App Customers | View registered mobile users with order stats |
| Online Orders | Platform-wide order list and dashboard stats |
| Delivery Drivers | Approve/reject/suspend freelance driver registrations |
| Driver Payouts | Earnings table, delivery counts, CSV export |
| Analytics | GMV, revenue, orders/day chart, top stores, trend indicators |

### 2. Company Portal — `company/` (port 3000)
**Role:** Company Employee (JWT with `company_id` claim)

| Feature | Description |
|---------|-------------|
| Dashboard | Sales overview, recent orders, quick stats |
| Products | CRUD with categories, pricing, multi-currency, online shop toggle |
| Customers | B2B customer management |
| Employees | Staff management with role-based permissions |
| Warehouses & Vans | Inventory locations and vehicles |
| Direct Sales (POS) | Multi-currency transactions, receipt printing |
| Invoices & Returns | Invoice management, return processing |
| Online Store Settings | Enable store, delivery fees, banner, categories, location |
| Online Orders | Manage incoming orders, advance status, assign drivers |
| Chart of Accounts | Manage financial accounts (assets, liabilities, equity, revenue, expenses) |
| Journal Entries | View auto-posted entries, create manual entries, reverse entries |
| Account Ledger | Per-account transaction history with running balance |
| Financial Reports | Income Statement (P&L), Balance Sheet, Trial Balance |

### 3. Salesman Portal — `salesman/` (port 5175)
**Role:** Company Employee (salesman)

| Feature | Description |
|---------|-------------|
| Daily Routes | View assigned customer visit routes |
| Customer Visits | Place orders on behalf of B2B customers |
| Collections | Record payments and collections |

### 4. Driver Portal — `driver/` (port 5174)
**Role:** Company Employee (driver)

| Feature | Description |
|---------|-------------|
| Assigned Deliveries | View and manage assigned delivery routes |
| Route Management | Company-internal delivery operations |

### 5. Online Store App — `onlinestore/` (port 8081)
**Role:** `AppCustomer` (or guest)  
**Platform:** iOS, Android, Web (React Native / Expo)

| Feature | Description |
|---------|-------------|
| Marketplace | Browse categories, featured stores, search |
| Near Me | Geolocation-based store discovery (Haversine sorting) |
| Store & Products | View store products, add to cart |
| Checkout | Guest or registered, delivery or pickup, notes |
| Order Tracking | Track by phone (guest) or account (registered) |
| Reviews & Ratings | Submit and read store reviews with star ratings |
| Favorites & Addresses | Save stores/products, manage delivery addresses |
| i18n | English, Arabic, French with RTL support |
| Dark Mode | Persistent light/dark theme toggle |
| Deep Linking | `Catalyst-store://store/{id}` for QR codes and sharing |

### 6. Delivery App — `delivery/` (port 8082)
**Roles:** `FreelanceDriver` or `DeliveryCompany`  
**Platform:** iOS, Android, Web (React Native / Expo)

| Feature (Driver Mode) | Description |
|------------------------|-------------|
| Registration | Apply as freelance driver (pending admin approval) |
| Go Online/Offline | Toggle availability, send GPS coordinates |
| Available Orders | Geo-sorted unassigned orders, accept with confirmation |
| My Orders | Active and completed deliveries with status filters |
| Pickup & Deliver | Mark picked up → mark delivered with proof + COD |
| Earnings | Period breakdowns, recent delivery history |

| Feature (Company Mode) | Description |
|-------------------------|-------------|
| Fleet Dashboard | Driver count, online count, active orders, revenue |
| Driver Management | Add, suspend, activate, remove drivers |
| Fleet Orders | All orders handled by company's drivers |

### 7. Delivery Portal — `delivery-portal/` (port 8083)
**Role:** `DeliveryCompany`

| Feature | Description |
|---------|-------------|
| Dashboard | 6 stat cards — drivers, online, active orders, revenue |
| Drivers | Data table with add modal, suspend/activate/remove actions |
| Orders | Filterable order table with driver assignment badges |

---

## Project Structure

```
Catalyst-main/
├── backend/                # .NET 8 API Server
│   ├── Controllers/        # REST endpoints (50+ controllers)
│   ├── Models/             # EF Core entities (52+ models)
│   ├── Services/           # AccountingService, AuthService, PermissionService
│   ├── Data/               # AppDbContext + relationships
│   ├── DTOs/               # Request/response data objects
│   └── Program.cs          # Startup, DI, auto-migration SQL
│
├── admin/                  # Super Admin Dashboard
├── company/                # Company Management Portal
├── driver/                 # Company Driver Portal
├── salesman/               # Field Salesman Portal
├── delivery-portal/        # Delivery Company Fleet Portal
│   └── src/
│       ├── pages/          # Login, Dashboard, Drivers, Orders
│       ├── components/     # Layout with sidebar
│       └── lib/            # Axios client + JWT interceptor
│
├── onlinestore/            # Consumer Mobile App (Expo)
│   └── src/
│       ├── screens/        # 15+ screens
│       ├── api/            # marketplace, orders, client
│       ├── stores/         # Zustand (auth, cart, theme)
│       ├── i18n/           # en, ar, fr translations
│       └── navigation/     # Stack + Tab navigators
│
├── delivery/               # Delivery Driver Mobile App (Expo)
│   └── src/
│       ├── screens/        # 12+ screens (driver + company modes)
│       ├── api/            # driver, companyApi, client
│       └── stores/         # Zustand (auth with role)
│
├── Catalyst_schema.sql      # Complete DB schema (71 tables)
├── globals.md              # Feature documentation by phase
├── start-all.bat           # Launch all portals (Windows)
└── README.md               # This file
```

---

## Port Assignments

| Service | Port | Stack | URL |
|---------|------|-------|-----|
| **Backend API** | 5227 | .NET 8 | `http://localhost:5227` |
| **Company Portal** | 3000 | React + Vite | `http://localhost:3000` |
| **Driver Portal** | 5174 | React + Vite | `http://localhost:5174` |
| **Salesman Portal** | 5175 | React + Vite | `http://localhost:5175` |
| **Admin Portal** | 5176 | React + Vite | `http://localhost:5176` |
| **Online Store App** | 8081 | React Native (Expo) | `http://localhost:8081` |
| **Delivery App** | 8082 | React Native (Expo) | `http://localhost:8082` |
| **Delivery Portal** | 8083 | React + Vite | `http://localhost:8083` |

---

## Authentication

All portals use **JWT Bearer tokens** issued by the backend.

| JWT Role | Issued To | Used By |
|----------|-----------|---------|
| `SuperAdmin` | Platform administrators | Admin Portal |
| Employee (with `company_id` claim) | Company staff | Company, Salesman, Driver portals |
| `AppCustomer` | Registered shoppers | Online Store App |
| `FreelanceDriver` | Independent delivery drivers | Delivery App (driver mode) |
| `DeliveryCompany` | Fleet management companies | Delivery App (company mode), Delivery Portal |

---

## How to Run

> **Prerequisites:** Node.js 18+, .NET 8 SDK, PostgreSQL running locally.

### Quick Start (Windows)

```bash
start-all.bat
```

This opens separate terminal windows for the backend + all 5 web portals. Mobile apps must be started separately.

### Individual Services

```bash
# Backend API (must start first — runs DB migrations)
cd backend && dotnet run

# Web portals (any order)
cd admin && npm install && npm run dev
cd company && npm install && npm run dev
cd driver && npm install && npm run dev
cd salesman && npm install && npm run dev
cd delivery-portal && npm install && npm run dev

# Mobile apps (Expo — press w for web, a for Android, i for iOS)
cd onlinestore && npm install && npx expo start
cd delivery && npm install && npx expo start
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | .NET 8, Entity Framework Core, PostgreSQL, BCrypt |
| **Web Portals** | React 18, TypeScript, Vite, TailwindCSS, React Query |
| **Mobile Apps** | React Native 0.81, Expo 54, Zustand, React Navigation |
| **Icons** | Lucide React (web), Ionicons (mobile) |
| **Auth** | JWT Bearer tokens, role-based access control |
| **HTTP Client** | Axios with token interceptors (all frontends) |
| **Geolocation** | Haversine formula (backend), expo-location (mobile) |
| **i18n** | i18n-js with AsyncStorage persistence |

---

## Key Design Decisions

1. **Single API, multiple frontends** — One .NET backend serves all 7+ client apps via REST, reducing duplication and ensuring data consistency.
2. **Auto-migration** — Schema changes use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS`, enabling zero-downtime deployments.
3. **Role-based JWT** — Each portal only sees endpoints allowed for its role. Company portals scope all queries by `company_id` from the JWT claim.
4. **Freelance vs Company drivers** — Two separate driver models. Company drivers are employees; freelance drivers register independently and are approved by admins.
5. **Delivery companies** — Fleet operators manage groups of freelance drivers through a dedicated portal, bridging the gap between individual drivers and platform-managed delivery.
6. **Multi-currency** — Exchange rate snapshots captured at sale time for accurate historical reporting.
7. **Guest checkout** — Online orders support both registered customers and guests (phone-based tracking).
8. **Cross-platform mobile** — React Native (Expo) for iOS, Android, and Web from a single codebase.

---

## License

Proprietary — All rights reserved.
