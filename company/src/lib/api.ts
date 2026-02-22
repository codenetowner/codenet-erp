import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if we're not already on auth endpoints or sidebar config (to allow login flow to work)
    const isAuthEndpoint = error.config?.url?.includes('/auth/')
    const isSidebarEndpoint = error.config?.url?.includes('/sidebar/')
    if (error.response?.status === 401 && !isAuthEndpoint && !isSidebarEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = (import.meta.env.BASE_URL || '/') + 'login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  // Try company admin login first, then employee login
  login: async (username: string, password: string) => {
    try {
      // Try company admin login first
      return await api.post('/auth/company/login', { username, password })
    } catch (companyError: any) {
      // If company login fails, try to get company by username and do employee login
      if (companyError.response?.status === 401) {
        // Get company ID by looking up which company this employee belongs to
        const lookupRes = await api.post('/auth/employee/lookup', { username })
        const companyId = lookupRes.data.companyId
        
        if (companyId) {
          return await api.post('/auth/employee/login', 
            { username, password },
            { headers: { 'X-Company-Id': companyId.toString() } }
          )
        }
        throw companyError
      }
      throw companyError
    }
  },
  getMe: () => api.get('/auth/me'),
}

// Products
export const productsApi = {
  getAll: (params?: Record<string, any>) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  getCostHistory: (id: number) => api.get(`/products/${id}/cost-history`),
  addCostHistory: (id: number, data: any) => api.post(`/products/${id}/cost-history`, data),
  getInventory: (id: number) => api.get(`/products/${id}/inventory`),
  getValuation: (params?: Record<string, any>) => api.get('/products/valuation', { params }),
  bulkImport: (data: any) => api.post('/products/bulk-import', data),
  bulkAssign: (data: any) => api.post('/products/bulk-assign', data),
  bulkOnlineShop: (data: any) => api.post('/products/bulk-online-shop', data),
  adjustStock: (data: any) => api.post('/products/stock-adjustment', data),
  getStockAdjustments: (params?: Record<string, any>) => api.get('/products/stock-adjustments', { params }),
  // Variants
  getVariants: (productId: number) => api.get(`/products/${productId}/variants`),
  createVariant: (productId: number, data: any) => api.post(`/products/${productId}/variants`, data),
  updateVariant: (productId: number, variantId: number, data: any) => api.put(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId: number, variantId: number) => api.delete(`/products/${productId}/variants/${variantId}`),
}

// Customers
export const customersApi = {
  getAll: (params?: Record<string, any>) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  // Special Pricing
  getSpecialPrices: (customerId: number) => api.get(`/customers/${customerId}/special-prices`),
  addSpecialPrice: (customerId: number, data: any) => api.post(`/customers/${customerId}/special-prices`, data),
  updateSpecialPrice: (customerId: number, priceId: number, data: any) => api.put(`/customers/${customerId}/special-prices/${priceId}`, data),
  deleteSpecialPrice: (customerId: number, priceId: number) => api.delete(`/customers/${customerId}/special-prices/${priceId}`),
  // Maps link resolver
  resolveMapsLink: (url: string) => api.post('/customers/resolve-maps-link', { url }),
}

// Orders
export const ordersApi = {
  getAll: (params?: Record<string, any>) => api.get('/orders', { params }),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  updateStatus: (id: number, status: string) => api.put(`/orders/${id}/status`, { status }),
}

// Employees
export const employeesApi = {
  getAll: (params?: Record<string, any>) => api.get('/employees', { params }),
  getById: (id: number) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: number, data: any) => api.put(`/employees/${id}`, data),
  updateRating: (id: number, rating: number) => api.patch(`/employees/${id}/rating`, { rating }),
  toggleStatus: (id: number) => api.patch(`/employees/${id}/status`),
  delete: (id: number) => api.delete(`/employees/${id}`),
  getWarehouses: () => api.get('/employees/warehouses'),
  getVans: () => api.get('/employees/vans'),
  // Visibility control
  getVisibility: (id: number) => api.get(`/employees/${id}/visibility`),
  updateVisibilitySettings: (id: number, data: { restrictCustomers: boolean; restrictProducts: boolean }) => 
    api.put(`/employees/${id}/visibility/settings`, data),
  assignCustomers: (id: number, customerIds: number[]) => 
    api.put(`/employees/${id}/visibility/customers`, { itemIds: customerIds }),
  assignProducts: (id: number, productIds: number[]) => 
    api.put(`/employees/${id}/visibility/products`, { itemIds: productIds }),
  // Visit analysis for salesmen
  getVisitAnalysis: (id: number, startDate?: string, endDate?: string) => 
    api.get(`/employees/${id}/visit-analysis`, { params: { startDate, endDate } }),
}

// Salesmen
export const salesmenApi = {
  getAll: () => api.get('/employees/salesmen'),
  getPerformance: (id: number, date?: string) => api.get(`/employees/salesmen/${id}/performance`, { params: { date } }),
}

// Warehouses
export const warehousesApi = {
  getAll: (params?: Record<string, any>) => api.get('/warehouses', { params }),
  getById: (id: number) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: number, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: number) => api.delete(`/warehouses/${id}`),
}

// Vans
export const vansApi = {
  getAll: (params?: Record<string, any>) => api.get('/vans', { params }),
  getById: (id: number) => api.get(`/vans/${id}`),
  create: (data: any) => api.post('/vans', data),
  update: (id: number, data: any) => api.put(`/vans/${id}`, data),
  delete: (id: number) => api.delete(`/vans/${id}`),
  getDrivers: () => api.get('/vans/drivers'),
  getStock: (id: number) => api.get(`/vans/${id}/stock`),
  getMovements: (id: number, limit?: number) => api.get(`/vans/${id}/movements`, { params: { limit } }),
  loadStock: (id: number, data: { productId: number; quantity: number; notes?: string }) => api.post(`/vans/${id}/load-stock`, data),
  unloadStock: (id: number, data: { productId: number; quantity: number; notes?: string }) => api.post(`/vans/${id}/unload-stock`, data),
}

// Tasks
export const tasksApi = {
  getAll: (params?: Record<string, any>) => api.get('/tasks', { params }),
  getById: (id: number) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: number, status: string) => api.put(`/tasks/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/tasks/${id}`),
}

// Suppliers
export const suppliersApi = {
  getAll: (params?: Record<string, any>) => api.get('/suppliers', { params }),
  getById: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: number, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  // Purchase Orders
  getPurchaseOrders: (params?: Record<string, any>) => api.get('/suppliers/purchase-orders', { params }),
  getPurchaseOrder: (id: number) => api.get(`/suppliers/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api.post('/suppliers/purchase-orders', data),
  updatePurchaseOrderStatus: (id: number, status: string) => api.put(`/suppliers/purchase-orders/${id}/status`, { status }),
  deletePurchaseOrder: (id: number) => api.delete(`/suppliers/purchase-orders/${id}`),
  // Invoices
  getInvoices: (params?: Record<string, any>) => api.get('/suppliers/invoices', { params }),
  getInvoice: (id: number) => api.get(`/suppliers/invoices/${id}`),
  createInvoice: (data: any) => api.post('/suppliers/invoices', data),
  // Payments
  getPayments: (params?: Record<string, any>) => api.get('/suppliers/payments', { params }),
  createPayment: (data: any) => api.post('/suppliers/payments', data),
  updatePayment: (id: number, data: any) => api.put(`/suppliers/payments/${id}`, data),
  deletePayment: (id: number) => api.delete(`/suppliers/payments/${id}`),
}

// Expenses
export const expensesApi = {
  getAll: (params?: Record<string, any>) => api.get('/expenses', { params }),
  getById: (id: number) => api.get(`/expenses/${id}`),
  create: (data: any) => api.post('/expenses', data),
  update: (id: number, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  createCategory: (data: any) => api.post('/expenses/categories', data),
  updateCategory: (id: number, data: any) => api.put(`/expenses/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/expenses/categories/${id}`),
}

// Cash
export const cashApi = {
  getCollections: (params?: Record<string, any>) => api.get('/cash/collections', { params }),
  createCollection: (data: any) => api.post('/cash/collections', data),
  getDeposits: (params?: Record<string, any>) => api.get('/cash/deposits', { params }),
  createDeposit: (data: any) => api.post('/cash/deposits', data),
  updateDepositStatus: (id: number, data: any) => api.put(`/cash/deposits/${id}/status`, data),
  getVanCash: () => api.get('/cash/van-cash'),
  getOverview: () => api.get('/cash/overview'),
}

// Categories
export const categoriesApi = {
  getAll: (params?: Record<string, any>) => api.get('/categories', { params }),
  getById: (id: number) => api.get(`/categories/${id}`),
  getSubcategories: (id: number) => api.get(`/categories/${id}/subcategories`),
  create: (data: any) => api.post('/categories', data),
  update: (id: number, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

// Currencies
export const currenciesApi = {
  getAll: () => api.get('/currencies'),
  create: (data: any) => api.post('/currencies', data),
  update: (id: number, data: any) => api.put(`/currencies/${id}`, data),
  delete: (id: number) => api.delete(`/currencies/${id}`),
}

// Units
export const unitsApi = {
  getAll: (params?: Record<string, any>) => api.get('/units', { params }),
  getById: (id: number) => api.get(`/units/${id}`),
  create: (data: any) => api.post('/units', data),
  update: (id: number, data: any) => api.put(`/units/${id}`, data),
  delete: (id: number) => api.delete(`/units/${id}`),
}

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
}

// Roles
export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id: number) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: number, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
}

// Dashboard
export const dashboardApi = {
  getStats: (params?: Record<string, any>) => api.get('/dashboard/stats', { params }),
}

// Leads
export const leadsApi = {
  getAll: (params?: Record<string, any>) => api.get('/leads', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/leads/${id}`).then(r => r.data),
  create: (data: any) => api.post('/leads', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data),
  convert: (id: number, data: any) => api.post(`/leads/${id}/convert`, data).then(r => r.data),
  reject: (id: number, reason?: string) => api.post(`/leads/${id}/reject`, { reason }),
  delete: (id: number) => api.delete(`/leads/${id}`),
  getSummary: () => api.get('/leads/summary').then(r => r.data),
}

// Returns
export const returnsApi = {
  getAll: (params?: Record<string, any>) => api.get('/returns', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/returns/${id}`).then(r => r.data),
  create: (data: any) => api.post('/returns', data).then(r => r.data),
  approve: (id: number) => api.post(`/returns/${id}/approve`),
  reject: (id: number, reason?: string) => api.post(`/returns/${id}/reject`, { reason }),
  process: (id: number, data: any) => api.post(`/returns/${id}/process`, data),
  delete: (id: number) => api.delete(`/returns/${id}`),
}

// Direct Sales - Return/Exchange
export const directSalesApi = {
  getInventory: (warehouseId?: number) => api.get('/direct-sales/inventory', { params: { warehouseId } }).then(r => r.data),
  getCustomerPrices: (customerId: number) => api.get(`/direct-sales/customer-prices/${customerId}`).then(r => r.data),
  createSale: (data: any) => api.post('/direct-sales', data).then(r => r.data),
  getSales: (params?: Record<string, any>) => api.get('/direct-sales', { params }).then(r => r.data),
  // Return/Exchange
  getOrderByNumber: (orderNumber: string) => api.get(`/direct-sales/order/${encodeURIComponent(orderNumber)}`).then(r => r.data),
  processReturnExchange: (data: any) => api.post('/direct-sales/return-exchange', data).then(r => r.data),
  getReturnExchanges: (params?: Record<string, any>) => api.get('/direct-sales/return-exchanges', { params }).then(r => r.data),
}

// Quotes
export const quotesApi = {
  getAll: (params?: Record<string, any>) => api.get('/quotes', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/quotes/${id}`).then(r => r.data),
  getByNumber: (quoteNumber: string) => api.get(`/quotes/by-number/${quoteNumber}`).then(r => r.data),
  getSummary: () => api.get('/quotes/summary').then(r => r.data),
  create: (data: any) => api.post('/quotes', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/quotes/${id}`, data).then(r => r.data),
  updateStatus: (id: number, status: string) => api.put(`/quotes/${id}/status`, { status }),
  convert: (id: number, orderId: number) => api.post(`/quotes/${id}/convert`, { orderId }),
  delete: (id: number) => api.delete(`/quotes/${id}`),
}

// Employee Payments
export const employeePaymentsApi = {
  getAll: (params?: Record<string, any>) => api.get('/employee-payments', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/employee-payments/${id}`).then(r => r.data),
  getByEmployee: (employeeId: number) => api.get(`/employee-payments/employee/${employeeId}`).then(r => r.data),
  create: (data: any) => api.post('/employee-payments', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/employee-payments/${id}`, data),
  delete: (id: number) => api.delete(`/employee-payments/${id}`),
  getSummary: (params?: Record<string, any>) => api.get('/employee-payments/summary', { params }).then(r => r.data),
}

// Reports
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard').then(r => r.data),
  getSales: (startDate: string, endDate: string, driverId?: number) => 
    api.get('/reports/sales', { params: { startDate, endDate, driverId } }).then(r => r.data),
  getCollections: (startDate: string, endDate: string, driverId?: number) => 
    api.get('/reports/collections', { params: { startDate, endDate, driverId } }).then(r => r.data),
  getStock: (warehouseId?: number) => 
    api.get('/reports/stock', { params: { warehouseId } }).then(r => r.data),
  getExpenses: (startDate: string, endDate: string, categoryId?: number) => 
    api.get('/reports/expenses', { params: { startDate, endDate, categoryId } }).then(r => r.data),
  getDriverPerformance: (startDate: string, endDate: string, driverId?: number) => 
    api.get('/reports/driver-performance', { params: { startDate, endDate, driverId } }).then(r => r.data),
  getCustomerStatement: (customerId: number, startDate: string, endDate: string) => 
    api.get(`/reports/customer-statement/${customerId}`, { params: { startDate, endDate } }).then(r => r.data),
  getVanPerformance: (startDate: string, endDate: string, vanId?: number) => 
    api.get('/reports/van-performance', { params: { startDate, endDate, vanId } }).then(r => r.data),
}

// Attendance
export const attendanceApi = {
  getAll: (params?: Record<string, any>) => api.get('/attendance', { params }),
  getById: (id: number) => api.get(`/attendance/${id}`),
  getByEmployee: (employeeId: number, params?: Record<string, any>) => 
    api.get(`/attendance/employee/${employeeId}`, { params }),
  getSummary: (params?: Record<string, any>) => api.get('/attendance/summary', { params }),
  getEmployees: () => api.get('/attendance/employees'),
  create: (data: any) => api.post('/attendance', data),
  createBulk: (data: any[]) => api.post('/attendance/bulk', data),
  update: (id: number, data: any) => api.put(`/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/attendance/${id}`),
}

// Raw Materials
export const rawMaterialsApi = {
  getAll: (params?: Record<string, any>) => api.get('/rawmaterials', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/rawmaterials/${id}`).then(r => r.data),
  create: (data: any) => api.post('/rawmaterials', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/rawmaterials/${id}`, data),
  delete: (id: number) => api.delete(`/rawmaterials/${id}`),
  getInventory: (id: number) => api.get(`/rawmaterials/${id}/inventory`).then(r => r.data),
  getAllInventory: (params?: Record<string, any>) => api.get('/rawmaterials/inventory/all', { params }).then(r => r.data),
  adjustInventory: (id: number, data: any) => api.post(`/rawmaterials/${id}/inventory/adjust`, data),
}

// Raw Material Purchases
export const rawMaterialPurchasesApi = {
  getAll: (params?: Record<string, any>) => api.get('/rawmaterialpurchases', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/rawmaterialpurchases/${id}`).then(r => r.data),
  create: (data: any) => api.post('/rawmaterialpurchases', data).then(r => r.data),
  recordPayment: (id: number, data: any) => api.put(`/rawmaterialpurchases/${id}/payment`, data),
  delete: (id: number) => api.delete(`/rawmaterialpurchases/${id}`),
}

// Online Store Settings
export const onlineStoreSettingsApi = {
  get: () => api.get('/online-store-settings').then(r => r.data),
  update: (data: any) => api.put('/online-store-settings', data),
  getAvailableCategories: () => api.get('/online-store-settings/available-categories').then(r => r.data),
}

// Online Orders (company)
export const onlineOrdersApi = {
  getAll: (params?: Record<string, any>) => api.get('/onlineorders', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/onlineorders/${id}`).then(r => r.data),
  updateStatus: (id: number, data: any) => api.put(`/onlineorders/${id}/status`, data),
  assignDriver: (id: number, data: any) => api.put(`/onlineorders/${id}/assign-driver`, data),
  requestDriver: (id: number) => api.put(`/onlineorders/${id}/request-driver`),
  getStats: () => api.get('/onlineorders/stats').then(r => r.data),
}

// Accounting
export const accountingApi = {
  // Chart of Accounts
  getAccounts: (params?: Record<string, any>) => api.get('/accounting/accounts', { params }).then(r => r.data),
  getAccount: (id: number) => api.get(`/accounting/accounts/${id}`).then(r => r.data),
  createAccount: (data: any) => api.post('/accounting/accounts', data).then(r => r.data),
  updateAccount: (id: number, data: any) => api.put(`/accounting/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete(`/accounting/accounts/${id}`),
  // Journal Entries
  getJournalEntries: (params?: Record<string, any>) => api.get('/accounting/journal-entries', { params }).then(r => r.data),
  getJournalEntry: (id: number) => api.get(`/accounting/journal-entries/${id}`).then(r => r.data),
  createJournalEntry: (data: any) => api.post('/accounting/journal-entries', data).then(r => r.data),
  reverseJournalEntry: (id: number) => api.post(`/accounting/journal-entries/${id}/reverse`).then(r => r.data),
  // Account Ledger
  getLedger: (accountId: number, params?: Record<string, any>) => api.get(`/accounting/ledger/${accountId}`, { params }).then(r => r.data),
  // Financial Reports
  getTrialBalance: (params?: Record<string, any>) => api.get('/accounting/reports/trial-balance', { params }).then(r => r.data),
  getIncomeStatement: (startDate: string, endDate: string) => api.get('/accounting/reports/income-statement', { params: { startDate, endDate } }).then(r => r.data),
  getBalanceSheet: (params?: Record<string, any>) => api.get('/accounting/reports/balance-sheet', { params }).then(r => r.data),
  // Reset
  resetAccounting: () => api.post('/accounting/reset').then(r => r.data),
}

// Production Orders
export const productionOrdersApi = {
  getAll: (params?: Record<string, any>) => api.get('/productionorders', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/productionorders/${id}`).then(r => r.data),
  create: (data: any) => api.post('/productionorders', data).then(r => r.data),
  addCost: (id: number, data: any) => api.post(`/productionorders/${id}/costs`, data).then(r => r.data),
  removeCost: (id: number, costId: number) => api.delete(`/productionorders/${id}/costs/${costId}`),
  complete: (id: number) => api.post(`/productionorders/${id}/complete`).then(r => r.data),
  delete: (id: number) => api.delete(`/productionorders/${id}`),
}
