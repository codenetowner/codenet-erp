import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface PermissionContextType {
  permissions: Record<string, boolean>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  isCompanyAdmin: boolean
  isLoading: boolean
}

const PermissionContext = createContext<PermissionContextType | null>(null)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  const isCompanyAdmin = user?.role === 'CompanyAdmin' || user?.isSuperAdmin || false

  // Get permissions from user object (set during login)
  const permissions: Record<string, boolean> = (user as any)?.permissions || {}

  const hasPermission = (permission: string): boolean => {
    // CompanyAdmin and SuperAdmin have all permissions
    if (isCompanyAdmin) return true
    return permissions[permission] === true
  }

  const hasAnyPermission = (perms: string[]): boolean => {
    if (isCompanyAdmin) return true
    return perms.some(p => permissions[p] === true)
  }

  const hasAllPermissions = (perms: string[]): boolean => {
    if (isCompanyAdmin) return true
    return perms.every(p => permissions[p] === true)
  }

  return (
    <PermissionContext.Provider value={{
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isCompanyAdmin,
      isLoading
    }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Hook for checking a single permission
export function usePermission(permission: string): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

// Permission constants - matching the ones defined in Roles.tsx
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'View dashboard',
  VIEW_STATISTICS: 'View statistics',
  VIEW_CHARTS: 'View charts',

  // Employees
  VIEW_EMPLOYEES: 'View employees',
  CREATE_EMPLOYEES: 'Create employees',
  EDIT_EMPLOYEES: 'Edit employees',
  DELETE_EMPLOYEES: 'Delete employees',
  MANAGE_EMPLOYEE_PAYMENTS: 'Manage employee payments',

  // Attendance
  VIEW_ATTENDANCE: 'View attendance',
  CREATE_ATTENDANCE: 'Create attendance',
  EDIT_ATTENDANCE: 'Edit attendance',
  DELETE_ATTENDANCE: 'Delete attendance',

  // Roles
  VIEW_ROLES: 'View roles',
  CREATE_ROLES: 'Create roles',
  EDIT_ROLES: 'Edit roles',
  DELETE_ROLES: 'Delete roles',

  // Vans
  VIEW_VANS: 'View vans',
  CREATE_VANS: 'Create vans',
  EDIT_VANS: 'Edit vans',
  DELETE_VANS: 'Delete vans',
  VIEW_VAN_STOCK: 'View van stock',
  LOAD_VAN_STOCK: 'Load van stock',
  UNLOAD_VAN_STOCK: 'Unload van stock',

  // Warehouses
  VIEW_WAREHOUSES: 'View warehouses',
  CREATE_WAREHOUSES: 'Create warehouses',
  EDIT_WAREHOUSES: 'Edit warehouses',
  DELETE_WAREHOUSES: 'Delete warehouses',
  VIEW_WAREHOUSE_STOCK: 'View warehouse stock',
  ADJUST_INVENTORY: 'Adjust inventory',

  // Products
  VIEW_PRODUCTS: 'View products',
  CREATE_PRODUCTS: 'Create products',
  EDIT_PRODUCTS: 'Edit products',
  DELETE_PRODUCTS: 'Delete products',
  MANAGE_COST_HISTORY: 'Manage cost history',

  // Categories
  VIEW_CATEGORIES: 'View categories',
  CREATE_CATEGORIES: 'Create categories',
  EDIT_CATEGORIES: 'Edit categories',
  DELETE_CATEGORIES: 'Delete categories',

  // Units
  VIEW_UNITS: 'View units',
  CREATE_UNITS: 'Create units',
  EDIT_UNITS: 'Edit units',
  DELETE_UNITS: 'Delete units',

  // Inventory
  VIEW_INVENTORY_VALUATION: 'View inventory valuation',
  EDIT_INVENTORY_SETTINGS: 'Edit inventory settings',
  ADJUST_STOCK_LEVELS: 'Adjust stock levels',

  // Customers
  VIEW_CUSTOMERS: 'View customers',
  CREATE_CUSTOMERS: 'Create customers',
  EDIT_CUSTOMERS: 'Edit customers',
  DELETE_CUSTOMERS: 'Delete customers',
  VIEW_BALANCES: 'View balances',
  EDIT_CREDIT_LIMIT: 'Edit credit limit',
  MANAGE_SPECIAL_PRICES: 'Manage special prices',

  // Leads
  VIEW_LEADS: 'View leads',
  CREATE_LEADS: 'Create leads',
  EDIT_LEADS: 'Edit leads',
  CONVERT_LEADS: 'Convert leads',
  REJECT_LEADS: 'Reject leads',
  DELETE_LEADS: 'Delete leads',

  // Orders & Tasks
  VIEW_ORDERS: 'View orders',
  CREATE_ORDERS: 'Create orders',
  EDIT_ORDERS: 'Edit orders',
  CANCEL_ORDERS: 'Cancel orders',
  DELETE_ORDERS: 'Delete orders',
  VIEW_TASKS: 'View tasks',
  CREATE_TASKS: 'Create tasks',
  EDIT_TASKS: 'Edit tasks',
  DELETE_TASKS: 'Delete tasks',
  UPDATE_TASK_STATUS: 'Update task status',

  // Quotes
  VIEW_QUOTES: 'View quotes',
  CREATE_QUOTES: 'Create quotes',
  EDIT_QUOTES: 'Edit quotes',
  DELETE_QUOTES: 'Delete quotes',
  CONVERT_QUOTES_TO_ORDERS: 'Convert quotes to orders',

  // Direct Sales
  VIEW_DIRECT_SALES: 'View direct sales',
  CREATE_DIRECT_SALES: 'Create direct sales',

  // Returns
  VIEW_RETURNS: 'View returns',
  CREATE_RETURNS: 'Create returns',
  APPROVE_RETURNS: 'Approve returns',
  REJECT_RETURNS: 'Reject returns',
  PROCESS_RETURNS: 'Process returns',

  // Suppliers
  VIEW_SUPPLIERS: 'View suppliers',
  CREATE_SUPPLIERS: 'Create suppliers',
  EDIT_SUPPLIERS: 'Edit suppliers',
  DELETE_SUPPLIERS: 'Delete suppliers',
  VIEW_INVOICES: 'View invoices',
  CREATE_INVOICES: 'Create invoices',
  MANAGE_PAYMENTS: 'Manage payments',

  // Expenses
  VIEW_EXPENSES: 'View expenses',
  CREATE_EXPENSES: 'Create expenses',
  EDIT_EXPENSES: 'Edit expenses',
  DELETE_EXPENSES: 'Delete expenses',
  MANAGE_EXPENSE_CATEGORIES: 'Manage expense categories',

  // Cash Management
  VIEW_COLLECTIONS: 'View collections',
  CREATE_COLLECTIONS: 'Create collections',
  VIEW_DEPOSITS: 'View deposits',
  CREATE_DEPOSITS: 'Create deposits',
  APPROVE_DEPOSITS: 'Approve deposits',
  REJECT_DEPOSITS: 'Reject deposits',
  VIEW_VAN_CASH: 'View van cash',

  // Currencies
  VIEW_CURRENCIES: 'View currencies',
  CREATE_CURRENCIES: 'Create currencies',
  EDIT_CURRENCIES: 'Edit currencies',
  DELETE_CURRENCIES: 'Delete currencies',

  // Reports
  VIEW_DEEP_REPORT: 'View deep report',
  VIEW_SALES_REPORT: 'View sales report',
  VIEW_COLLECTIONS_REPORT: 'View collections report',
  VIEW_STOCK_REPORT: 'View stock report',
  VIEW_EXPENSES_REPORT: 'View expenses report',
  VIEW_DRIVER_PERFORMANCE: 'View driver performance',
  VIEW_CUSTOMER_STATEMENTS: 'View customer statements',
  VIEW_VAN_PERFORMANCE: 'View van performance',

  // Settings
  VIEW_SETTINGS: 'View settings',
  EDIT_COMPANY_SETTINGS: 'Edit company settings',
  MANAGE_ROLES_PERMISSIONS: 'Manage roles & permissions',

  // Online Store
  VIEW_ONLINE_STORE: 'View online store',
  EDIT_ONLINE_STORE: 'Edit online store',
  VIEW_ONLINE_ORDERS: 'View online orders',
  MANAGE_ONLINE_ORDERS: 'Manage online orders',

  // Accounting
  VIEW_ACCOUNTING: 'View accounting',
  MANAGE_CHART_OF_ACCOUNTS: 'Manage chart of accounts',
  VIEW_JOURNAL_ENTRIES: 'View journal entries',
  CREATE_JOURNAL_ENTRIES: 'Create journal entries',
  VIEW_FINANCIAL_REPORTS: 'View financial reports',
} as const
