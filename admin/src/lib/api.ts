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
  const token = localStorage.getItem('superadmin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('superadmin_token')
      localStorage.removeItem('superadmin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// SuperAdmin Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/superadmin/login', { username, password }),
  getMe: () => api.get('/auth/me'),
}

// Companies
export const companiesApi = {
  getAll: (params?: Record<string, any>) => api.get('/superadmin/companies', { params }),
  getById: (id: number) => api.get(`/superadmin/companies/${id}`),
  create: (data: any) => api.post('/superadmin/companies', data),
  update: (id: number, data: any) => api.put(`/superadmin/companies/${id}`, data),
  delete: (id: number) => api.delete(`/superadmin/companies/${id}`),
  resetPassword: (id: number, newPassword: string) => api.patch(`/superadmin/companies/${id}/reset-password`, { newPassword }),
  toggleStatus: (id: number) => api.put(`/superadmin/companies/${id}/toggle-status`),
}

// Plans
export const plansApi = {
  getAll: (params?: Record<string, any>) => api.get('/superadmin/plans', { params }),
  getById: (id: number) => api.get(`/superadmin/plans/${id}`),
  create: (data: any) => api.post('/superadmin/plans', data),
  update: (id: number, data: any) => api.put(`/superadmin/plans/${id}`, data),
  delete: (id: number) => api.delete(`/superadmin/plans/${id}`),
  toggle: (id: number) => api.patch(`/superadmin/plans/${id}/toggle`),
}

// Billing
export const billingApi = {
  getAll: (params?: Record<string, any>) => api.get('/superadmin/billing', { params }),
  getById: (id: number) => api.get(`/superadmin/billing/${id}`),
  create: (data: any) => api.post('/superadmin/billing', data),
  update: (id: number, data: any) => api.put(`/superadmin/billing/${id}`, data),
  delete: (id: number) => api.delete(`/superadmin/billing/${id}`),
}

// Dashboard Stats
export const statsApi = {
  getDashboard: () => api.get('/superadmin/dashboard'),
}

// Store Categories
export const storeCategoriesApi = {
  getAll: () => api.get('/admin/store-categories'),
  getById: (id: number) => api.get(`/admin/store-categories/${id}`),
  create: (data: any) => api.post('/admin/store-categories', data),
  update: (id: number, data: any) => api.put(`/admin/store-categories/${id}`, data),
  delete: (id: number) => api.delete(`/admin/store-categories/${id}`),
}

// Ad Placements
export const adPlacementsApi = {
  getAll: () => api.get('/admin/ad-placements'),
  create: (data: any) => api.post('/admin/ad-placements', data),
  update: (id: number, data: any) => api.put(`/admin/ad-placements/${id}`, data),
}

// Ads
export const adsApi = {
  getAll: (params?: Record<string, any>) => api.get('/admin/ads', { params }),
  create: (data: any) => api.post('/admin/ads', data),
  update: (id: number, data: any) => api.put(`/admin/ads/${id}`, data),
  delete: (id: number) => api.delete(`/admin/ads/${id}`),
  getRevenue: () => api.get('/admin/ads/revenue'),
}

// Premium Subscriptions
export const premiumApi = {
  getAll: (params?: Record<string, any>) => api.get('/admin/premium-subscriptions', { params }),
  create: (data: any) => api.post('/admin/premium-subscriptions', data),
  update: (id: number, data: any) => api.put(`/admin/premium-subscriptions/${id}`, data),
}

// App Customers
export const appCustomersApi = {
  getAll: (params?: Record<string, any>) => api.get('/admin/app-customers', { params }),
  getById: (id: number) => api.get(`/admin/app-customers/${id}`),
}

// Online Orders (admin)
export const onlineOrdersAdminApi = {
  getAll: (params?: Record<string, any>) => api.get('/admin/online-orders', { params }),
  getStats: () => api.get('/admin/online-orders/stats'),
}

// Analytics
export const analyticsApi = {
  get: () => api.get('/admin/analytics'),
}

// Freelance Drivers
export const freelanceDriversApi = {
  getAll: (params?: Record<string, any>) => api.get('/admin/freelance-drivers', { params }),
  getById: (id: number) => api.get(`/admin/freelance-drivers/${id}`),
  approve: (id: number) => api.put(`/admin/freelance-drivers/${id}/approve`),
  reject: (id: number, reason?: string) => api.put(`/admin/freelance-drivers/${id}/reject`, { reason }),
  suspend: (id: number) => api.put(`/admin/freelance-drivers/${id}/suspend`),
  getStats: () => api.get('/admin/freelance-drivers/stats'),
}
