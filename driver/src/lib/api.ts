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
  const token = localStorage.getItem('driver_token')
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
      localStorage.removeItem('driver_token')
      localStorage.removeItem('driver_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Driver Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/driver/login', { username, password }),
  getMe: () => api.get('/auth/me'),
}

// Dashboard
export const dashboardApi = {
  getDashboard: () => api.get('/driver/dashboard'),
  getCashSummary: () => api.get('/driver/cash-summary'),
  setStartingCash: (amount: number) => api.post('/driver/starting-cash', { amount }),
}

// Tasks
export const tasksApi = {
  getAll: (params?: { status?: string; date?: string }) => api.get('/driver/tasks', { params }),
  getById: (id: number) => api.get(`/driver/tasks/${id}`),
  updateStatus: (id: number, status: string, paymentType?: string, paidAmount?: number) => 
    api.put(`/driver/tasks/${id}/status`, { status, paymentType, paidAmount }),
  uploadProof: async (id: number, photo: File) => {
    // Upload to Cloudinary first
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    const formData = new FormData()
    formData.append('file', photo)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'proof_of_delivery')
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const cloudData = await cloudRes.json()
    if (!cloudData.secure_url) throw new Error('Cloudinary upload failed')
    // Save the URL to the backend
    return api.post(`/driver/tasks/${id}/proof`, { url: cloudData.secure_url })
  },
}

// Customers
export const customersApi = {
  getAll: (search?: string, warehouseId?: number) => api.get('/driver/customers', { params: { search, warehouseId } }),
  getById: (id: number) => api.get(`/driver/customers/${id}`),
  create: (data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    region?: string;
    customerType?: string;
    paymentTerms?: string;
    creditLimit?: number;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }) => api.post('/driver/customers', data),
}

// Warehouses
export const warehousesApi = {
  getAll: () => api.get('/driver/warehouses'),
}

// Products
export const productsApi = {
  getAll: () => api.get('/driver/products'),
  getPrice: (id: number, customerId?: number) => 
    api.get(`/driver/products/${id}/price`, { params: { customerId } }),
}

// Van Inventory
export const inventoryApi = {
  getVanInventory: () => api.get('/driver/inventory'),
  getCustomerPrices: (customerId: number) => api.get(`/driver/inventory/prices/${customerId}`),
}

// Orders (POS)
export const ordersApi = {
  create: (data: any) => api.post('/driver/orders', data),
}

// Collections
export const collectionsApi = {
  getAll: (date?: string) => api.get('/driver/collections', { params: { date } }),
  create: (data: any) => api.post('/driver/collections', data),
}

// Deposits
export const depositsApi = {
  getAll: (date?: string) => api.get('/driver/deposits', { params: { date } }),
  create: (data: any) => api.post('/driver/deposits', data),
}

// Shift
export const shiftApi = {
  getCurrent: () => api.get('/driver/shift/current'),
  start: (data?: { startCash?: number; notes?: string }) => api.post('/driver/shift/start', data || {}),
  end: (data?: { notes?: string }) => api.post('/driver/shift/end', data || {}),
  getSummary: () => api.get('/driver/shift/summary'),
}

// Leads
export const leadsApi = {
  getMyLeads: () => api.get('/driver/leads'),
  capture: (data: any) => api.post('/driver/leads', data),
}

// Returns
export const returnsApi = {
  getAll: () => api.get('/driver/returns'),
  create: (data: any) => api.post('/driver/returns', data),
}
