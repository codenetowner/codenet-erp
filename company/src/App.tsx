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
import Tasks from './pages/Tasks'
import Cash from './pages/Cash'
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
import Returns from './pages/Returns'
import Quotes from './pages/Quotes'
import DirectSales from './pages/DirectSales'
import DirectSalesManagement from './pages/DirectSalesManagement'
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
          <Route path="vans" element={<ProtectedRoute permission={PERMISSIONS.VIEW_VANS}><Vans /></ProtectedRoute>} />
          <Route path="salesmen" element={<ProtectedRoute permission={PERMISSIONS.VIEW_EMPLOYEES}><Salesmen /></ProtectedRoute>} />
          <Route path="warehouses" element={<ProtectedRoute permission={PERMISSIONS.VIEW_WAREHOUSES}><Warehouses /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><Products /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CUSTOMERS}><Customers /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ORDERS}><Tasks /></ProtectedRoute>} />
          <Route path="leads" element={<ProtectedRoute permission={PERMISSIONS.VIEW_LEADS}><Leads /></ProtectedRoute>} />
          <Route path="returns" element={<ProtectedRoute permission={PERMISSIONS.VIEW_RETURNS}><Returns /></ProtectedRoute>} />
          <Route path="quotes" element={<ProtectedRoute permission={PERMISSIONS.VIEW_QUOTES}><Quotes /></ProtectedRoute>} />
          <Route path="direct-sales" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DIRECT_SALES}><DirectSales /></ProtectedRoute>} />
          <Route path="sales-history" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DIRECT_SALES}><DirectSalesManagement /></ProtectedRoute>} />
          <Route path="deep-report" element={<ProtectedRoute permission={PERMISSIONS.VIEW_DEEP_REPORT}><DeepReport /></ProtectedRoute>} />
          <Route path="cash" element={<ProtectedRoute permission={PERMISSIONS.VIEW_COLLECTIONS}><Cash /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUPPLIERS}><Suppliers /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute permission={PERMISSIONS.VIEW_EXPENSES}><Expenses /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SALES_REPORT}><Reports /></ProtectedRoute>} />
          <Route path="valuation" element={<ProtectedRoute permission={PERMISSIONS.VIEW_INVENTORY_VALUATION}><Valuation /></ProtectedRoute>} />
          <Route path="inventory-settings" element={<ProtectedRoute permission={PERMISSIONS.EDIT_INVENTORY_SETTINGS}><InventorySettings /></ProtectedRoute>} />
          <Route path="currencies" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CURRENCIES}><Currencies /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CATEGORIES}><Categories /></ProtectedRoute>} />
          <Route path="units" element={<ProtectedRoute permission={PERMISSIONS.VIEW_UNITS}><Units /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SETTINGS}><Settings /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ROLES}><Roles /></ProtectedRoute>} />
          <Route path="attendance" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ATTENDANCE}><Attendance /></ProtectedRoute>} />
          <Route path="raw-materials" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><RawMaterials /></ProtectedRoute>} />
          <Route path="raw-material-purchases" element={<ProtectedRoute permission={PERMISSIONS.VIEW_SUPPLIERS}><RawMaterialPurchases /></ProtectedRoute>} />
          <Route path="production-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><ProductionOrders /></ProtectedRoute>} />
          <Route path="manufacturer-report/:id" element={<ProtectedRoute permission={PERMISSIONS.VIEW_PRODUCTS}><ManufacturerReport /></ProtectedRoute>} />
          <Route path="customer-report/:id" element={<ProtectedRoute permission={PERMISSIONS.VIEW_CUSTOMERS}><CustomerReport /></ProtectedRoute>} />
          <Route path="online-store-settings" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ONLINE_STORE}><OnlineStoreSettings /></ProtectedRoute>} />
          <Route path="online-orders" element={<ProtectedRoute permission={PERMISSIONS.VIEW_ONLINE_ORDERS}><OnlineOrders /></ProtectedRoute>} />
          <Route path="stock-adjustment" element={<ProtectedRoute permission={PERMISSIONS.ADJUST_STOCK_LEVELS}><StockAdjustment /></ProtectedRoute>} />
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
