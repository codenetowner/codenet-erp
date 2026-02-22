import api from './client';

export const companyApi = {
  login: (phone: string, password: string) =>
    api.post('/delivery-company/login', { phone, password }),
  register: (data: any) =>
    api.post('/delivery-company/register', data),

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
};
