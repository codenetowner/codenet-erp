# Multi-Currency Feature

## Overview
The Catalyst ERP system supports multi-currency transactions. Products can be priced in different currencies, and customers can pay using one or more currencies in a single transaction. All amounts are converted to a base currency (USD by default) for reporting and aggregation.

---

## Database Schema

### `currencies` table
Stores available currencies per company.
- `id`, `company_id`, `code` (e.g. USD, LBP, EUR), `name`, `symbol`, `exchange_rate`, `is_base`, `is_active`, `created_at`

### `products` table
- `currency VARCHAR(10) DEFAULT 'USD'` — the currency the product is priced in.

### `order_items` table
- `currency VARCHAR(10) DEFAULT 'USD'` — currency of each line item at time of sale.

### `orders` table
- `payment_currencies JSONB` — breakdown of how much was paid in each currency.
  - Example: `[{"currency": "USD", "amount": 50}, {"currency": "LBP", "amount": 4500000}]`
- `exchange_rate_snapshot JSONB` — exchange rates at the moment the order was placed.
  - Example: `{"USD": 1, "LBP": 90000, "EUR": 0.92}`

---

## Backend (C# / ASP.NET Core)

### Auto-Migration (Program.cs)
On startup, the backend runs `IF NOT EXISTS` ALTER TABLE statements to add:
- `order_items.currency`
- `orders.payment_currencies`
- `orders.exchange_rate_snapshot`
- `CREATE TABLE IF NOT EXISTS currencies`

### DirectSalesController
- Accepts `paymentCurrenciesJson` and `exchangeRateSnapshotJson` from the frontend.
- Stores them as JSONB in the `orders` table.
- Returns `PaymentCurrencies` and `ExchangeRateSnapshot` in the response DTO.

### OrdersController
- Returns `payment_currencies` and `exchange_rate_snapshot` fields when querying orders.

---

## Frontend (React / TypeScript)

### DirectSales.tsx
- **Currency selection in payment**: When checking out, the user can select which currencies to pay with and enter amounts for each.
- **Exchange rate conversion**: All currency amounts are converted to base currency using the exchange rates from the `currencies` table.
- **Order submission**: Sends `paymentCurrenciesJson` and `exchangeRateSnapshotJson` to the backend. If no explicit multi-currency payment is made, it defaults to the cart's currency breakdown.
- **Receipt modal**: Shows payment breakdown by currency (e.g. "USD 50 + LBP 4,500,000") instead of a single total.
- **Payment summary**: Displays each selected currency with its amount, and shows the base currency equivalent when multiple currencies are used.

### DeepReport.tsx
- **Transaction interface**: Includes `paymentCurrencies` and `exchangeRateSnapshot` fields.
- **Base currency conversion**: When processing orders, each item's `total` is converted to base currency using `exchangeRateSnapshot`. Formula: `itemTotal / exchangeRate`.
- **Cost & profit calculation**: Uses `itemToBase()` and `costToBase()` helper functions to convert item sales and costs to base currency.
- **Sales by currency aggregation**: Calculates `salesByCurrency` from transaction items to show per-currency totals.
- **Sales stat card**: Shows per-currency breakdown when multiple currencies exist (e.g. "USD 500", "LBP 45,000,000") plus a base currency total. Single currency shows just the code + amount.
- **Transaction detail panel**: Displays "Payment Currencies Breakdown" section showing which currencies the customer paid with and the exchange rates used.
- **Transaction table**: Shows payment currency breakdown below the payment type badge.

### Products.tsx
- Currency column in the products table displays the product's currency as static text (dropdown was removed since currency is now set at the product level and used automatically in sales).

### Currencies page (Currencies.tsx)
- Full CRUD for managing currencies: add, edit, delete, toggle active status.
- Set base currency and exchange rates.

---

## Key Design Decisions

1. **Exchange rate snapshot**: Rates are captured at sale time so historical reports remain accurate even if rates change later.
2. **JSONB storage**: Payment currencies and exchange rates are stored as JSONB for flexibility — no need for extra junction tables.
3. **Base currency conversion**: All aggregation (totals, costs, profits) converts to base currency for consistent reporting.
4. **Backward compatible**: All new columns use `DEFAULT` values and `IF NOT EXISTS` checks, so existing data and older deployments are unaffected.

---

## Permissions
- `View currencies` / `Create currencies` / `Edit currencies` / `Delete currencies` — control access to the Currencies management page.

---

# Online Store / Marketplace Feature

## Overview
The Catalyst ERP now includes a marketplace and online store system. Companies can enable their store for online ordering, customers can browse stores via the marketplace, and admins can manage store categories, ads/banners, and premium subscriptions.

---

## Database Schema (New Tables)

### `store_categories`
Marketplace categories (Supermarket, Electronics, Bakery, etc.)
- `id`, `name`, `name_ar`, `icon`, `image_url`, `sort_order`, `is_active`, `created_at`

### `company_store_categories`
Many-to-many link between companies and store categories.
- `id`, `company_id`, `store_category_id` (UNIQUE constraint on company_id + store_category_id)

### `ad_placements`
Defines ad slots (home_banner, category_banner, etc.)
- `id`, `name`, `description`, `max_width`, `max_height`, `price_per_day`, `price_per_week`, `price_per_month`, `is_active`

### `ads`
Individual advertisements/banners.
- `id`, `company_id`, `placement_id`, `title`, `image_url`, `link_url`, `start_date`, `end_date`, `is_active`, `impressions`, `clicks`, `amount_paid`, `payment_status`, `created_at`

### `premium_subscriptions`
Premium store subscription records.
- `id`, `company_id`, `tier`, `start_date`, `end_date`, `amount`, `payment_status`, `features` (JSONB), `created_at`

### `app_customers`
Mobile app customer accounts (separate from B2B customers).
- `id`, `name`, `phone` (UNIQUE), `email`, `password_hash`, `photo_url`, `auth_provider`, `auth_provider_id`, `is_verified`, `is_active`, `created_at`, `updated_at`

### `app_customer_addresses`
Delivery addresses for app customers.
- `id`, `customer_id`, `label`, `address`, `city`, `lat`, `lng`, `is_default`, `created_at`

### `online_orders`
Orders placed through the online store.
- `id`, `order_number`, `company_id`, `app_customer_id`, `guest_name`, `guest_phone`, `guest_address`, `status`, `subtotal`, `delivery_fee`, `discount`, `total`, `payment_method`, `payment_status`, `notes`, `delivery_address`, `delivery_lat`, `delivery_lng`, `estimated_delivery`, `delivered_at`, `cancelled_at`, `cancel_reason`, `delivery_type`, `assigned_driver_type`, `assigned_company_driver_id`, `assigned_freelance_driver_id`, `created_at`, `updated_at`
- Status flow: `pending` → `confirmed` → `preparing` → `delivering` → `delivered` (or `cancelled`)

### `online_order_items`
Line items for online orders.
- `id`, `order_id`, `product_id`, `product_name`, `unit_type`, `quantity`, `unit_price`, `total`, `currency`, `notes`

### `app_favorites`
Customer favorites (stores or products).
- `id`, `customer_id`, `company_id`, `product_id`, `created_at`

### `companies` table (new columns)
- `store_category_id` — primary store category
- `is_online_store_enabled` — whether store appears in marketplace
- `store_description`, `store_banner_url`, `store_theme_color`
- `delivery_enabled`, `delivery_fee`, `min_order_amount`
- `store_lat`, `store_lng`
- `whatsapp_number`
- `is_premium`, `premium_tier`

---

## Backend (C# / ASP.NET Core)

### New Models
`StoreCategory`, `CompanyStoreCategory`, `AdPlacement`, `Ad`, `PremiumSubscription`, `AppCustomer`, `AppCustomerAddress`, `OnlineOrder`, `OnlineOrderItem`, `AppFavorite`

### New Controllers

#### Public APIs
- **MarketplaceController** (`/api/marketplace`)
  - `GET /categories` — list active store categories with store counts
  - `GET /stores` — list online stores with filters (categoryId, search, lat/lng)
  - `GET /stores/featured` — premium/featured stores
  - `GET /banners` — active ads/banners (auto-increments impressions)
  - `POST /banners/{id}/click` — track ad click

#### SuperAdmin APIs (Authorize: SuperAdmin)
- **StoreCategoriesController** (`/api/admin/store-categories`) — full CRUD
- **AdsController** (`/api/admin/ad-placements`, `/api/admin/ads`) — CRUD for placements and ads, plus revenue stats
- **PremiumController** (`/api/admin/premium-subscriptions`) — CRUD, auto-updates company premium status
- **AppCustomersController** (`/api/admin/app-customers`) — list/detail with order stats
- **OnlineOrdersAdminController** (`/api/admin/online-orders`) — list all orders, stats dashboard

#### Company APIs (Authorize: authenticated company user)
- **OnlineOrdersController** (`/api/onlineorders`) — list/detail/status update/assign driver/stats for the company's orders
- **OnlineStoreSettingsController** (`/api/online-store-settings`) — get/update store settings, available categories

#### StoreController fix
- `GetProducts` now filters by `ShowInOnlineShop == true`

---

## Admin Panel (React)

### New Pages
- **Store Categories** (`/store-categories`) — CRUD with grid cards, Arabic name support, sort order, active toggle
- **Ads Manager** (`/ads`) — 3-tab view: Ads list, Placements, Revenue dashboard. Full CRUD for ads and placements with CTR tracking
- **Premium Stores** (`/premium`) — subscription management with stats, tier badges, company linking

### New API Functions (api.ts)
`storeCategoriesApi`, `adPlacementsApi`, `adsApi`, `premiumApi`, `appCustomersApi`, `onlineOrdersAdminApi`

### Layout/Routes
New nav items: Store Categories (Grid3X3), Ads Manager (Megaphone), Premium Stores (Crown)

---

## Company Portal (React)

### New Pages
- **Online Store Settings** (`/online-store-settings`) — toggle online store, store description/banner/theme, delivery settings, location, WhatsApp, category selection
- **Online Orders** (`/online-orders`) — order list with status tabs, expandable order detail, status advancement workflow, cancel with reason, real-time stats (15s polling)

### New API Functions (api.ts)
`onlineStoreSettingsApi`, `onlineOrdersApi`

### Layout/Routes
New nav section "Online Store" with Store Settings (Store icon) and Online Orders (ShoppingBag icon)

### New Permissions
- `View online store`, `Edit online store`, `View online orders`, `Manage online orders`

### Products Page
- `showInOnlineShop` checkbox already exists in the product add/edit form — controls visibility in the public store API

---

## StoreController Updates (Phase 3)

### Order Placement (`POST /api/store/{companyId}/orders`)
- Now creates `OnlineOrder` + `OnlineOrderItem` records in the database alongside inventory deduction
- Accepts expanded DTO: `customerName`, `customerPhone`, `customerAddress`, `deliveryType`, `deliveryAddress`, `notes`, and items with `productName`, `unitType`, `unitPrice`, `currency`
- Returns `id`, `orderNumber`, `status`, `subtotal`, `deliveryFee` in response
- Generates order numbers: `ON-{companyId}-{timestamp}-{random}`
- Uses delivery fee from company settings when delivery type is "delivery"

### Public Order Lookup
- `GET /api/store/orders/by-phone?phone=` — lookup orders by guest phone number (no auth)
- `GET /api/store/orders/{id}` — get single order detail by ID (no auth, for guest tracking)

---

## AppCustomerController (`/api/app`) — Phase 3

Authenticated endpoints for logged-in app customers (requires `AppCustomer` role JWT). Ready for when OTP auth is integrated.

### Profile
- `GET /api/app/profile` — get customer profile
- `PUT /api/app/profile` — update name, email, photo

### Addresses
- `GET /api/app/addresses` — list saved addresses
- `POST /api/app/addresses` — add address (label, address, city, lat/lng, isDefault)
- `PUT /api/app/addresses/{id}` — update address
- `DELETE /api/app/addresses/{id}` — delete address

### Favorites
- `GET /api/app/favorites` — list favorites (stores + products with details)
- `POST /api/app/favorites` — add favorite (companyId or productId)
- `DELETE /api/app/favorites/{id}` — remove favorite

### Orders (authenticated)
- `GET /api/app/orders` — order history for logged-in customer
- `GET /api/app/orders/{id}` — order detail

---

## React Native App — Phase 3 Screens

### New Screens (`onlinestore/src/screens/`)
- **OrderConfirmationScreen** — success page after placing order, shows order number + status badge, links to order detail and continue shopping
- **OrderHistoryScreen** — phone-based order lookup (guest mode), shows order cards with status badges, date, totals; navigates to OrderDetail
- **OrderDetailScreen** — full order detail with status timeline stepper (pending→confirmed→preparing→delivering→delivered), store info with call button, delivery address, itemized list, payment summary, notes; handles cancelled orders separately; refresh button for status polling
- **SavedAddressesScreen** — address list with labels/default badges, add address modal (label, address, city, default toggle), delete support; shows "Sign in Required" for guests
- **FavoritesScreen** — placeholder with "Sign in Required" for guests, "No Favorites Yet" empty state with browse button for logged-in users; will be fully wired when auth is integrated

### New API Module (`onlinestore/src/api/orders.ts`)
- `ordersApi.getOrdersByPhone(phone)` — guest order lookup
- `ordersApi.getOrderDetail(orderId)` — single order detail
- TypeScript interfaces: `OrderItem`, `OrderSummary`, `OrderDetail`

### Navigation Updates
- **CartStack**: added `OrderConfirmation` screen
- **ProfileStack**: added `OrderHistory`, `OrderDetail`, `SavedAddresses`, `Favorites` screens
- **ProfileScreen menu**: "My Orders", "Favorites", "Saved Addresses" now navigate to their respective screens

### CheckoutScreen Fix
- API call corrected from `POST /store/order` to `POST /store/{companyId}/orders`
- Request body now uses correct field names: `customerName`, `customerPhone`, `customerAddress`, `deliveryType`, `deliveryAddress`, `notes`

---

## Key Design Decisions

1. **Separate customer model**: `app_customers` is distinct from B2B `customers` — different auth flow (phone OTP, social login), different order model.
2. **Guest checkout**: `online_orders` supports both registered (`app_customer_id`) and guest (`guest_name`, `guest_phone`, `guest_address`) orders.
3. **Premium tiers**: Managed via `premium_subscriptions` with auto-sync to `companies.is_premium` and `companies.premium_tier`.
4. **Ad tracking**: Impressions auto-increment on fetch, clicks tracked via explicit POST endpoint.
5. **Safe migrations**: All schema changes use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
6. **Guest order tracking**: Orders can be looked up by phone number without authentication, allowing guests to track orders.
7. **Auth-gated features**: Saved addresses and favorites screens show "Sign in Required" for guests, ready for OTP auth integration.

---

## Near Me / Geolocation — Phase 3

### Backend
- `GET /api/marketplace/stores` — already accepts `lat`/`lng` query params; when provided, calculates Haversine distance and sorts by proximity (premium first, then distance)
- `GET /api/marketplace/stores/nearby` — dedicated endpoint with `lat`, `lng`, `radiusKm` (default 50km); returns only stores with coordinates set, sorted by distance, capped at 30 results
- `CalculateDistance()` — Haversine formula helper in `MarketplaceController`

### Frontend (`HomeScreen.tsx`)
- Requests foreground location permission via `expo-location`
- Fetches nearby stores from `/marketplace/stores/nearby`
- Renders horizontal "Near You" card carousel with store logo, name, distance (km), delivery info
- Gracefully handles permission denied (section simply hidden)

### Dependencies
- `expo-location` ~18.0.10 added to `package.json`
- `app.json` updated with `expo-location` plugin, iOS `NSLocationWhenInUseUsageDescription`, Android location permissions

---

## Deep Linking — Phase 3

### Configuration
- **Scheme**: `Catalyst-store://` (set in `app.json` → `expo.scheme`)
- **Web domain**: `https://Catalyst.store` (future)
- **NavigationContainer `linking` config** in `AppNavigator.tsx`:
  - `store/:companyId` → HomeTab → Store screen
  - `category/:categoryId` → HomeTab → StoreList screen
  - `search` → HomeTab → Search screen
  - `orders` → ProfileTab → OrderHistory screen
  - `orders/:orderId` → ProfileTab → OrderDetail screen
  - `profile` → ProfileTab → Profile screen
  - `cart` → CartTab
  - `categories` → CategoriesTab

### Usage
- QR codes can encode `Catalyst-store://store/123` to open a specific store directly
- Web links `https://Catalyst.store/store/123` (when web domain is configured)

---

## Admin Analytics — Phase 4

### Backend (`AnalyticsController` — `GET /api/admin/analytics`)
Comprehensive platform metrics endpoint returning:
- **Customers**: total, thisMonth, lastMonth
- **Orders**: total, today, thisMonth, lastMonth, statusBreakdown (pending/confirmed/preparing/delivering/delivered/cancelled)
- **Revenue**: totalGMV, gmvThisMonth, gmvLastMonth, totalAdRevenue, adRevenueThisMonth, premiumRevenue, activePremiums, totalPlatformRevenue
- **Stores**: totalOnlineStores, premiumStores
- **topStores**: top 10 stores by revenue (companyId, storeName, orderCount, revenue)
- **ordersPerDay**: last 30 days (date, count, revenue)

### Admin Panel (`/analytics`)
- 8 stat cards: customers, orders, GMV, platform revenue, online stores, premium stores, ad revenue, avg order value
- Month-over-month trend indicators (green/red arrows with percentage)
- Bar chart: orders per day (last 30 days) with hover tooltips
- Order status breakdown: horizontal progress bars with counts and percentages
- Top stores table: ranked by revenue with order count
- Nav item: Analytics (BarChart3 icon) in sidebar

---

## Delivery Driver App — Phase 5

### Project Structure (`delivery/`)
```
delivery/
├── App.tsx                    # Root: AuthStack or MainTab based on token
├── index.ts                   # Expo entry point
├── app.json                   # Expo config (Catalyst-driver scheme, location perms)
├── package.json               # Same stack as onlinestore (Expo 54, RN 0.81)
├── tsconfig.json
└── src/
    ├── theme.ts               # Dark theme (navy/slate palette)
    ├── api/
    │   ├── client.ts          # Axios + JWT interceptor (FreelanceDriver role)
    │   └── driver.ts          # All API calls (register, login, orders, earnings, etc.)
    ├── stores/
    │   └── authStore.ts       # Zustand: token, driver, setAuth, logout
    └── screens/
        ├── LoginScreen.tsx     # Phone + password login, pending/rejected handling
        ├── RegisterScreen.tsx  # Full registration form with vehicle type picker
        ├── HomeScreen.tsx      # Dashboard: online toggle, today stats, quick actions
        ├── AvailableOrdersScreen.tsx  # Geo-sorted orders, accept with confirmation
        ├── MyOrdersScreen.tsx  # Filter tabs (All/Active/Delivered), order cards
        ├── OrderDetailScreen.tsx      # Full detail + pickup/delivered actions + call buttons
        ├── EarningsScreen.tsx  # Period breakdowns + recent deliveries list
        └── ProfileScreen.tsx   # Driver info, stats, vehicle, sign out
```

### Navigation
- **AuthStack**: Login → Register
- **MainTab** (bottom tabs):
  - **HomeTab**: HomeStackScreen → HomeMain
  - **OrdersTab**: OrdersStack → AvailableOrders, MyOrders, OrderDetail
  - **EarningsTab**: EarningsScreen
  - **ProfileTab**: ProfileScreen

### Backend — FreelanceDriver Model (`freelance_drivers` table)
Key fields: `name`, `phone`, `password_hash`, `photo_url`, `id_document_url`, `license_url`, `vehicle_type`, `vehicle_plate`, `vehicle_color`, `status` (pending/approved/rejected/suspended), `is_online`, `current_lat`, `current_lng`, `rating`, `total_deliveries`, `total_earnings`, `rejection_reason`, `approved_at`

### Backend — FreelanceDriverController (`/api/freelance/`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register new driver (pending approval) |
| POST | `/login` | Public | Login → JWT token (role: FreelanceDriver) |
| GET | `/profile` | Driver | Get driver profile |
| PUT | `/profile` | Driver | Update profile fields |
| POST | `/toggle-online` | Driver | Toggle online/offline with lat/lng |
| POST | `/update-location` | Driver | Update current GPS position |
| GET | `/dashboard` | Driver | Today's stats + available order count |
| GET | `/available-orders` | Driver | Unassigned delivery orders, geo-sorted |
| POST | `/orders/{id}/accept` | Driver | Accept an available order |
| GET | `/my-orders` | Driver | Driver's assigned orders (filterable by status) |
| GET | `/orders/{id}` | Driver | Order detail with items + addresses |
| PUT | `/orders/{id}/picked-up` | Driver | Mark order picked up from store |
| PUT | `/orders/{id}/delivered` | Driver | Mark delivered + update earnings |
| GET | `/earnings` | Driver | Period breakdowns + recent deliveries |

### Backend — Admin FreelanceDriversAdminController (`/api/admin/freelance-drivers/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all drivers (filter by status, search) |
| GET | `/{id}` | Driver detail + recent orders |
| PUT | `/{id}/approve` | Approve pending driver |
| PUT | `/{id}/reject` | Reject with reason |
| PUT | `/{id}/suspend` | Suspend active driver |
| GET | `/stats` | Aggregate stats (total, pending, online, earnings)

### Key Design Decisions
1. **Freelance vs Company drivers**: `FreelanceDriver` is a separate model from `Employee`. Company drivers are existing employees with `is_driver=true`. Freelance drivers register independently and are platform-managed.
2. **Order assignment**: `OnlineOrder` has both `assigned_company_driver_id` and `assigned_freelance_driver_id` with `assigned_driver_type` discriminator.
3. **Geo-sorting**: Available orders sorted by Haversine distance from driver's current location.
4. **Earnings**: Delivery fee credited to driver on each completed delivery, tracked via `total_deliveries` and `total_earnings` on the driver record.
5. **Approval flow**: Drivers register → status "pending" → admin approves/rejects → driver can then login and go online.

---

## Rating & Reviews — Phase 6

### Backend — StoreReview Model (`store_reviews` table)
Key fields: `company_id`, `app_customer_id` (nullable), `order_id` (nullable), `guest_name`, `rating` (1-5), `comment`, `reply`, `replied_at`, `is_visible`

### Backend — ReviewsController (`/api/marketplace/stores/{companyId}/reviews`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Public | Paginated reviews list (visible only) |
| GET | `/summary` | Public | Average rating + breakdown (5/4/3/2/1 star counts) |
| POST | `/` | Public | Submit review (guest or authenticated, optionally linked to order) |

### Backend — StoreReviewsController (`/api/online-orders/reviews`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Company | List all reviews for company's store |
| PUT | `/{id}/reply` | Company | Reply to a review |

### Frontend — ReviewsScreen (`onlinestore/src/screens/ReviewsScreen.tsx`)
- Summary card: large avg rating number, star display, 5-star breakdown bars
- Review cards: avatar initial, name, date, stars, comment, store reply (indented blue-left-border box)
- FAB "Write Review" → bottom sheet modal with name input, star picker (tap to select), comment textarea
- Paginated with infinite scroll (`onEndReached`)
- Registered in `HomeStack` and `CategoriesStack` navigators

### StoreScreen Integration
- "Reviews" pill button in store header (star icon + "Reviews" text)
- Navigates to ReviewsScreen with `companyId` and `storeName` params
- Auto-updates company `rating` field on new review submission

---

## Multi-Language (i18n) — Phase 6

### Setup
- **expo-localization** `~55.0.5`: detect device locale
- **i18n-js** `^4.4.3`: translation engine with fallback
- **@react-native-async-storage/async-storage** `2.1.2`: persist language preference

### Files
- `onlinestore/src/i18n/index.ts` — I18n instance, `loadSavedLanguage()`, `setLanguage()`, `isRTL()`, `t()` helper
- `onlinestore/src/i18n/en.ts` — English translations (~120 keys)
- `onlinestore/src/i18n/ar.ts` — Arabic translations
- `onlinestore/src/i18n/fr.ts` — French translations

### Usage
- Import `t` from `../i18n` and use `t('key')` in any screen
- Language selector in ProfileScreen: modal with 🇺🇸 English / 🇸🇦 العربية / 🇫🇷 Français
- Persisted to AsyncStorage (`@app_language` key), auto-loaded on startup
- Falls back to English if device locale not in [en, ar, fr]
- `isRTL()` helper available for Arabic layout adjustments

---

## Dark Mode — Phase 6

### Theme System
- `onlinestore/src/theme.ts` — exports `lightColors`, `darkColors`, and mutable `colors` (defaults to light)
- `onlinestore/src/stores/themeStore.ts` — Zustand store with `mode`, `colors`, `setMode()`, `toggle()`, `loadSavedTheme()`
- Persisted to AsyncStorage (`@app_theme` key)

### Color Palettes
| Token | Light | Dark |
|-------|-------|------|
| background | #F9FAFB | #0F172A |
| surface | #FFFFFF | #1E293B |
| text | #111827 | #F1F5F9 |
| textSecondary | #6B7280 | #94A3B8 |
| border | #E5E7EB | #334155 |
| primary | #2563EB | #4F7DF3 |

### ProfileScreen Integration
- Dark Mode toggle row with moon/sun icon and On/Off label
- Tapping toggles between light and dark, persists preference

---

## Delivery Proof & COD — Phase 5

### Backend Changes
- **OnlineOrder model** — new fields: `delivery_proof_url`, `cod_collected`, `cod_amount`, `delivered_at`, `picked_up_at`
- **Migration SQL** — ALTER TABLE `online_orders` for all 5 columns
- **DeliveryProofDto** — `ProofPhotoUrl` (string?), `CodCollected` (bool)
- **MarkDelivered** — accepts `DeliveryProofDto`, validates COD collection for `payment_method=cod`, stores proof URL and COD amount
- **MarkPickedUp** — now sets `picked_up_at` timestamp

### Frontend (delivery app)
- **OrderDetailScreen** — "Complete Delivery" button opens confirmation form:
  - COD orders: Switch toggle to confirm cash collection with amount display (yellow highlighted box)
  - Proof photo URL text input (optional)
  - Cancel / Confirm Delivered buttons
  - COD validation: blocks delivery confirmation if cash not confirmed

---

## Admin Driver Payouts — Phase 5

### Page (`admin/src/pages/DriverPayouts.tsx`)
- Route: `/payouts` — Sidebar: "Driver Payouts" (Wallet icon)
- **Stats cards**: Active Drivers, Total Earnings, Total Deliveries, Avg per Driver
- **Searchable table**: Driver name/phone, vehicle type, deliveries count, total earned, avg/delivery, online status
- **Totals row**: aggregated deliveries + total payable
- **Export CSV** button (UI only, wiring deferred)
- Data sourced from `freelanceDriversApi.getAll({ status: 'approved' })` + `.getStats()`

---

## Online Store Auth — Phase 7

### Backend — AppCustomerController Auth Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/app/register` | Public | Register with name, phone, email, password (BCrypt hash). Returns JWT + customer object |
| POST | `/api/app/login` | Public | Login with phone + password. Returns JWT (role: AppCustomer) + customer object |

### Frontend — Online Store (`onlinestore/`)
- **LoginScreen** (`onlinestore/src/screens/LoginScreen.tsx`) — phone + password form, calls `/api/app/login`, stores token via `authStore.setAuth()`
- **RegisterScreen** (`onlinestore/src/screens/RegisterScreen.tsx`) — name, phone, email (optional), password, confirm password; calls `/api/app/register`
- **ProfileScreen** — "Sign In / Register" button now navigates to Login screen via `navigation.navigate('Login')`
- **AppNavigator** — Login and Register screens registered in `ProfileStack`
- **Navigation types** — `ProfileStackParamList` already defines `Login` and `Register` routes

---

## Bug Fixes — Phase 7

### CheckoutScreen `Alert.alert` on Web
- `Alert.alert` doesn't work reliably on React Native Web (callbacks not fired)
- Fixed: added `showAlert()` helper using `Platform.OS === 'web' ? window.alert() : Alert.alert()`
- Applied to validation errors and API error messages in `CheckoutScreen.tsx`

### Available Orders Filter — `platform_driver` DeliveryType
- **Root cause**: `GetAvailableOrders` in `FreelanceDriverController` filtered for `DeliveryType == "delivery"` only. When company clicks "External Delivery", the `RequestPlatformDriver` endpoint sets it to `"platform_driver"`, so the order became invisible to freelance drivers.
- **Fix**: Changed filter to `(o.DeliveryType == "delivery" || o.DeliveryType == "platform_driver")`

### Delivery App `Alert.alert` on Web
- Same `Alert.alert` callback issue in `AvailableOrdersScreen.tsx` — fixed with `window.confirm` on web platform
- `ProfileScreen.tsx` logout — fixed with `window.confirm` on web

---

## Delivery Company Fleet Management — Phase 7

### Concept
Delivery companies with multiple drivers can register, manage their fleet, and view all orders handled by their drivers. Two interfaces: a dedicated web portal (React+Vite+Tailwind) and basic management screens in the RN delivery app.

### Database Schema

#### `delivery_companies` table (#66)
- `id`, `name`, `phone` (UNIQUE), `email`, `password_hash`, `address`, `logo_url`, `contact_person`, `is_active`, `created_at`, `updated_at`

#### `freelance_drivers` table (#67) — updated
- Added `delivery_company_id INT REFERENCES delivery_companies(id) ON DELETE SET NULL` — nullable FK to group drivers under a company

### Backend — DeliveryCompany Model (`backend/Models/DeliveryCompany.cs`)
- Navigation property: `ICollection<FreelanceDriver> Drivers`
- Registered in `AppDbContext` as `DbSet<DeliveryCompany> DeliveryCompanies`

### Backend — DeliveryCompanyController (`/api/delivery-company/`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register delivery company (BCrypt password) |
| POST | `/login` | Public | Login → JWT (role: DeliveryCompany, 90-day expiry) |
| GET | `/profile` | Company | Profile + driver count |
| PUT | `/profile` | Company | Update name, email, address, contact person |
| GET | `/drivers` | Company | List all company drivers with stats |
| POST | `/drivers` | Company | Add driver (auto-approved, linked to company) |
| PUT | `/drivers/{id}` | Company | Update driver details |
| DELETE | `/drivers/{id}` | Company | Remove driver (unlinks, doesn't delete) |
| PATCH | `/drivers/{id}/toggle-status` | Company | Suspend/activate driver |
| GET | `/orders` | Company | All orders assigned to company's drivers (filterable by status) |
| GET | `/dashboard` | Company | Stats: totalDrivers, onlineDrivers, activeOrders, completedToday, todayRevenue, totalRevenue |

### Delivery Portal — Web App (`delivery-portal/`)
```
delivery-portal/
├── index.html
├── package.json          # React 18, Vite 5, Tailwind 3, react-query, axios, lucide-react, react-router-dom
├── vite.config.ts        # Port 8083, proxy /api → localhost:5227
├── tailwind.config.js    # Indigo primary palette (slate-900/950 dark theme)
├── tsconfig.json
└── src/
    ├── main.tsx          # React root + QueryClient + BrowserRouter
    ├── index.css         # Tailwind directives + dark body
    ├── App.tsx           # Routes: /login, / (Layout wrapper with Dashboard, Drivers, Orders)
    ├── lib/
    │   └── api.ts        # Axios client + JWT interceptor (localStorage dp_token), authApi + companyApi
    ├── components/
    │   └── Layout.tsx    # Sidebar nav (Dashboard, Drivers, Orders, Sign Out) + Outlet
    └── pages/
        ├── Login.tsx     # Phone + password login form
        ├── Dashboard.tsx # 6 stat cards + quick tips
        ├── Drivers.tsx   # Data table + Add Driver modal + suspend/activate/remove actions
        └── Orders.tsx    # Data table with status filter tabs + driver assignment badges
```

### RN Delivery App Updates (`delivery/`)
- **authStore** — added `role` (`'driver' | 'company'`), `company` profile, `setCompanyAuth()` method
- **LoginScreen** — Driver/Company toggle with mode-aware icon, title, and login flow
- **App.tsx** — routes to `CompanyNavigator` (Dashboard, Drivers, Orders, Profile tabs) vs `DriverNavigator` based on `role`
- **New screens**: `CompanyDashboardScreen`, `CompanyDriversScreen`, `CompanyOrdersScreen`
- **ProfileScreen** — role-aware: shows company info or driver info, web-compatible logout
- **companyApi.ts** — API client for all `/api/delivery-company/` endpoints

### start-all.bat
- Added `delivery-portal` on port 8083

### Port Assignments
| Service | Port |
|---------|------|
| Backend API | 5227 |
| Company Portal | 3000 |
| Driver Portal | 5174 |
| Salesman Portal | 5175 |
| Admin Portal | 5176 |
| Online Store (RN Web) | 8081 |
| Delivery App (RN Web) | 8082 |
| Delivery Portal | 8083 |
