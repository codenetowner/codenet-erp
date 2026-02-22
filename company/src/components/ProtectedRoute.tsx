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
  '/attendance': PERMISSIONS.VIEW_ATTENDANCE,
  '/roles': PERMISSIONS.VIEW_ROLES,
  '/vans': PERMISSIONS.VIEW_VANS,
  '/salesmen': PERMISSIONS.VIEW_EMPLOYEES,
  '/warehouses': PERMISSIONS.VIEW_WAREHOUSES,
  '/products': PERMISSIONS.VIEW_PRODUCTS,
  '/categories': PERMISSIONS.VIEW_CATEGORIES,
  '/units': PERMISSIONS.VIEW_UNITS,
  '/valuation': PERMISSIONS.VIEW_INVENTORY_VALUATION,
  '/inventory-settings': PERMISSIONS.EDIT_INVENTORY_SETTINGS,
  '/raw-materials': PERMISSIONS.VIEW_PRODUCTS,
  '/raw-material-purchases': PERMISSIONS.VIEW_SUPPLIERS,
  '/production-orders': PERMISSIONS.VIEW_PRODUCTS,
  '/customers': PERMISSIONS.VIEW_CUSTOMERS,
  '/leads': PERMISSIONS.VIEW_LEADS,
  '/tasks': PERMISSIONS.VIEW_ORDERS,
  '/quotes': PERMISSIONS.VIEW_QUOTES,
  '/direct-sales': PERMISSIONS.VIEW_DIRECT_SALES,
  '/sales-history': PERMISSIONS.VIEW_DIRECT_SALES,
  '/returns': PERMISSIONS.VIEW_RETURNS,
  '/cash': PERMISSIONS.VIEW_COLLECTIONS,
  '/suppliers': PERMISSIONS.VIEW_SUPPLIERS,
  '/expenses': PERMISSIONS.VIEW_EXPENSES,
  '/currencies': PERMISSIONS.VIEW_CURRENCIES,
  '/reports': PERMISSIONS.VIEW_SALES_REPORT,
  '/deep-report': PERMISSIONS.VIEW_DEEP_REPORT,
  '/settings': PERMISSIONS.VIEW_SETTINGS,
}

// Order of routes to try when finding the default landing page
const routePriority = [
  '/',
  '/direct-sales',
  '/tasks',
  '/products',
  '/customers',
  '/cash',
  '/reports',
  '/deep-report',
  '/employees',
  '/warehouses',
  '/vans',
  '/suppliers',
  '/expenses',
  '/currencies',
  '/settings',
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
