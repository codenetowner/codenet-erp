import { Navigate } from 'react-router-dom'
import { usePermissions, PERMISSIONS } from '../contexts/PermissionContext'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  permission?: string
  children: ReactNode
}

// Map each route path to its required permission
export const routePermissions: Record<string, string> = {
  '/': PERMISSIONS.VIEW_DASHBOARD,
  '/employees': PERMISSIONS.VIEW_EMPLOYEES,
  '/attendances-time-off': PERMISSIONS.VIEW_ATTENDANCE,
  '/users-companies': PERMISSIONS.VIEW_ROLES,
  '/fleet': PERMISSIONS.VIEW_VANS,
  '/sales-teams': PERMISSIONS.VIEW_EMPLOYEES,
  '/locations-warehouses': PERMISSIONS.VIEW_WAREHOUSES,
  '/products': PERMISSIONS.VIEW_PRODUCTS,
  '/product-categories': PERMISSIONS.VIEW_CATEGORIES,
  '/units-of-measure': PERMISSIONS.VIEW_UNITS,
  '/inventory-valuation': PERMISSIONS.VIEW_INVENTORY_VALUATION,
  '/configuration': PERMISSIONS.EDIT_INVENTORY_SETTINGS,
  '/inventory-adjustments': PERMISSIONS.ADJUST_STOCK_LEVELS,
  '/bill-of-materials': PERMISSIONS.VIEW_PRODUCTS,
  '/purchase-orders': PERMISSIONS.VIEW_SUPPLIERS,
  '/manufacturing-orders': PERMISSIONS.VIEW_PRODUCTS,
  '/customers': PERMISSIONS.VIEW_CUSTOMERS,
  '/crm-pipeline': PERMISSIONS.VIEW_LEADS,
  '/activities': PERMISSIONS.VIEW_ORDERS,
  '/quotations': PERMISSIONS.VIEW_QUOTES,
  '/point-of-sale': PERMISSIONS.VIEW_DIRECT_SALES,
  '/sales-orders': PERMISSIONS.VIEW_DIRECT_SALES,
  '/credit-notes': PERMISSIONS.VIEW_RETURNS,
  '/payment-collections': PERMISSIONS.VIEW_COLLECTIONS,
  '/vendors': PERMISSIONS.VIEW_SUPPLIERS,
  '/employee-expenses': PERMISSIONS.VIEW_EXPENSES,
  '/currencies': PERMISSIONS.VIEW_CURRENCIES,
  '/sales-analysis': PERMISSIONS.VIEW_SALES_REPORT,
  '/advanced-analytics': PERMISSIONS.VIEW_DEEP_REPORT,
  '/general-settings': PERMISSIONS.VIEW_SETTINGS,
  '/user-interface': PERMISSIONS.VIEW_SETTINGS,
  '/chart-of-accounts': PERMISSIONS.VIEW_ACCOUNTING,
  '/journal-entries': PERMISSIONS.VIEW_ACCOUNTING,
  '/account-ledger': PERMISSIONS.VIEW_ACCOUNTING,
  '/financial-reports': PERMISSIONS.VIEW_FINANCIAL_REPORTS,
  '/web-orders': PERMISSIONS.VIEW_ONLINE_ORDERS,
  '/ecommerce-config': PERMISSIONS.VIEW_ONLINE_STORE,
}

// Order of routes to try when finding the default landing page
const routePriority = [
  '/',
  '/point-of-sale',
  '/activities',
  '/products',
  '/customers',
  '/payment-collections',
  '/sales-analysis',
  '/advanced-analytics',
  '/employees',
  '/locations-warehouses',
  '/fleet',
  '/vendors',
  '/employee-expenses',
  '/currencies',
  '/general-settings',
]

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { hasPermission, isCompanyAdmin } = usePermissions()

  if (isCompanyAdmin || !permission || hasPermission(permission)) {
    return <>{children}</>
  }

  // Redirect to first allowed page
  return <DefaultRedirect />
}

export function DefaultRedirect() {
  const { hasPermission, isCompanyAdmin } = usePermissions()

  if (isCompanyAdmin) {
    return <Navigate to="/" replace />
  }

  for (const path of routePriority) {
    const perm = routePermissions[path]
    if (perm && hasPermission(perm)) {
      return <Navigate to={path} replace />
    }
  }

  // No permissions at all — show a message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-700">No Access</h2>
        <p className="text-gray-500 mt-2">You don't have permission to access any pages. Contact your administrator.</p>
      </div>
    </div>
  )
}
