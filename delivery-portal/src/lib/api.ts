import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dp_token')
      localStorage.removeItem('dp_company')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  login: (phone: string, password: string) => api.post('/delivery-company/login', { phone, password }),
  register: (data: any) => api.post('/delivery-company/register', data),
}

export const companyApi = {
  getProfile: () => api.get('/delivery-company/profile').then(r => r.data),
  updateProfile: (data: any) => api.put('/delivery-company/profile', data),
  getDashboard: () => api.get('/delivery-company/dashboard').then(r => r.data),
  getDrivers: () => api.get('/delivery-company/drivers').then(r => r.data),
  addDriver: (data: any) => api.post('/delivery-company/drivers', data),
  updateDriver: (id: number, data: any) => api.put(`/delivery-company/drivers/${id}`, data),
  removeDriver: (id: number) => api.delete(`/delivery-company/drivers/${id}`),
  toggleDriverStatus: (id: number) => api.patch(`/delivery-company/drivers/${id}/toggle-status`),
  getOrders: (status?: string) =>
    api.get('/delivery-company/orders', { params: status ? { status } : {} }).then(r => r.data),
}
