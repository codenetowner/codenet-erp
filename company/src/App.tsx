import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { PermissionProvider, PERMISSIONS } from './contexts/PermissionContext'
import Layout from './components/Layout'
import { ProtectedRoute, DefaultRedirect } from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Employees from './pages/Employees'
import Vans from './pages/Vans'
import Salesmen from './pages/Salesmen'
import Warehouses from './pages/Warehouses'
import Activities from './pages/Activities'
import PaymentCollections from './pages/PaymentCollections'
import Suppliers from './pages/Suppliers'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Valuation from './pages/Valuation'
import InventorySettings from './pages/InventorySettings'
import Currencies from './pages/Currencies'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Roles from './pages/Roles'
import Leads from './pages/Leads'
import Units from './pages/Units'
import CreditNotes from './pages/CreditNotes'
import Quotations from './pages/Quotations'
import PointOfSale from './pages/PointOfSale'
import SalesOrders from './pages/SalesOrders'
import DeepReport from './pages/DeepReport'
import Attendance from './pages/Attendance'
import RawMaterials from './pages/RawMaterials'
import RawMaterialPurchases from './pages/RawMaterialPurchases'
import ProductionOrders from './pages/ProductionOrders'
import ManufacturerReport from './pages/ManufacturerReport'
import CustomerReport from './pages/CustomerReport'
import OnlineStoreSettings from './pages/OnlineStoreSettings'
import OnlineOrders from './pages/OnlineOrders'
import StockAdjustment from './pages/StockAdjustment'
import ChartOfAccounts from './pages/ChartOfAccounts'
import JournalEntries from './pages/JournalEntries'
import FinancialReports from './pages/FinancialReports'
import AccountLedger from './pages/AccountLedger'
import SidebarSettings from './pages/SidebarSettings'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <PermissionProvider>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<ProtectedRoute permission={PERMISSIONS.VIEW_DASHBOARD}><Dashboard /></ProtectedRoute>} />
          <Route path="no-access" element={<DefaultRedirect />} />
          <Route path="employees" element={<ProtectedRoute permission={PERMISSIONS.VIEW_EMPLOYEES}><Employees /></ProtectedRoute>} />
          <Route path="fleet" element={<ProtectedRoute permission={PERMISSIONS.VIEW_VANS}><Vans /></ProtectedRoute>} />
          <Route path="sales-teams" element={<ProtectedRoute permission={PERMISSIONS.VIEW_EMPLOYEES}><Salesmen /></ProtectedRoute>} />
          <Route path="locations-warehouses" element={<ProtectedRoute permission={PERMISSIONS.VIEW_WAREHOUSES}><Warehouses /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><Products /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CUSTOMERS}><Customers /></ProtectedRoute>} />
          <Route path="activities" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ORDERS}><Activities /></ProtectedRoute>} />
          <Route path="crm-pipeline" element={<ProtectedRoute permission={PERMISSIONS.VIEW_LEADS}><Leads /></ProtectedRoute>} />
          <Route path="credit-notes" element={<ProtectedRoute permission={PERMISSIONS.VIEW_RETURNS}><CreditNotes /></ProtectedRoute>} />
          <Route path="quotations" element={<ProtectedRoute permission={PERMISSIONS.VIEW_QUOTES}><Quotations /></ProtectedRoute>} />
          <Route path="point-of-sale" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DIRECT_SALES}><PointOfSale /></ProtectedRoute>} />
          <Route path="sales-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DIRECT_SALES}><SalesOrders /></ProtectedRoute>} />
          <Route path="advanced-analytics" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DEEP_REPORT}><DeepReport /></ProtectedRoute>} />
          <Route path="payment-collections" element={<ProtectedRoute permission={PERMISSIONS.VIEW_COLLECTIONS}><PaymentCollections /></ProtectedRoute>} />
          <Route path="vendors" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUPPLIERS}><Suppliers /></ProtectedRoute>} />
          <Route path="employee-expenses" element={<ProtectedRoute permission={PERMISSIONS.VIEW_EXPENSES}><Expenses /></ProtectedRoute>} />
          <Route path="sales-analysis" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SALES_REPORT}><Reports /></ProtectedRoute>} />
          <Route path="inventory-valuation" element={<ProtectedRoute permission={PERMISSIONS.VIEW_INVENTORY_VALUATION}><Valuation /></ProtectedRoute>} />
          <Route path="configuration" element={<ProtectedRoute permission={PERMISSIONS.EDIT_INVENTORY_SETTINGS}><InventorySettings /></ProtectedRoute>} />
          <Route path="currencies" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CURRENCIES}><Currencies /></ProtectedRoute>} />
          <Route path="product-categories" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CATEGORIES}><Categories /></ProtectedRoute>} />
          <Route path="units-of-measure" element={<ProtectedRoute permission={PERMISSIONS.VIEW_UNITS}><Units /></ProtectedRoute>} />
          <Route path="general-settings" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SETTINGS}><Settings /></ProtectedRoute>} />
          <Route path="user-interface" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SETTINGS}><SidebarSettings /></ProtectedRoute>} />
          <Route path="users-companies" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ROLES}><Roles /></ProtectedRoute>} />
          <Route path="attendances-time-off" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ATTENDANCE}><Attendance /></ProtectedRoute>} />
          <Route path="bill-of-materials" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><RawMaterials /></ProtectedRoute>} />
          <Route path="purchase-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUPPLIERS}><RawMaterialPurchases /></ProtectedRoute>} />
          <Route path="manufacturing-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><ProductionOrders /></ProtectedRoute>} />
          <Route path="manufacturer-report/:id" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><ManufacturerReport /></ProtectedRoute>} />
          <Route path="customer-report/:id" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CUSTOMERS}><CustomerReport /></ProtectedRoute>} />
          <Route path="ecommerce-config" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ONLINE_STORE}><OnlineStoreSettings /></ProtectedRoute>} />
          <Route path="web-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ONLINE_ORDERS}><OnlineOrders /></ProtectedRoute>} />
          <Route path="inventory-adjustments" element={<ProtectedRoute permission={PERMISSIONS.ADJUST_STOCK_LEVELS}><StockAdjustment /></ProtectedRoute>} />
          <Route path="chart-of-accounts" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ACCOUNTING}><ChartOfAccounts /></ProtectedRoute>} />
          <Route path="journal-entries" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ACCOUNTING}><JournalEntries /></ProtectedRoute>} />
          <Route path="financial-reports" element={<ProtectedRoute permission={PERMISSIONS.VIEW_FINANCIAL_REPORTS}><FinancialReports /></ProtectedRoute>} />
          <Route path="account-ledger" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ACCOUNTING}><AccountLedger /></ProtectedRoute>} />
        </Route>
      </Routes>
    </PermissionProvider>
  )
}

export default App
