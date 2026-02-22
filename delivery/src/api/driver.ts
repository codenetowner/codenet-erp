import api from './client';

export const driverApi = {
  register: (data: any) => api.post('/freelance/register', data),
  login: (phone: string, password: string) => api.post('/freelance/login', { phone, password }),

  getProfile: () => api.get('/freelance/profile').then(r => r.data),
  updateProfile: (data: any) => api.put('/freelance/profile', data),

  toggleOnline: (isOnline: boolean, lat?: number, lng?: number) =>
    api.post('/freelance/toggle-online', { isOnline, lat, lng }).then(r => r.data),
  updateLocation: (lat: number, lng: number) =>
    api.post('/freelance/update-location', { lat, lng }),

  getDashboard: () => api.get('/freelance/dashboard').then(r => r.data),

  getAvailableOrders: () => api.get('/freelance/available-orders').then(r => r.data),
  getMyOrders: (status?: string) =>
    api.get('/freelance/my-orders', { params: status ? { status } : {} }).then(r => r.data),
  getOrderDetail: (id: number) => api.get(`/freelance/orders/${id}`).then(r => r.data),

  acceptOrder: (id: number) => api.post(`/freelance/orders/${id}/accept`).then(r => r.data),
  markPickedUp: (id: number) => api.put(`/freelance/orders/${id}/picked-up`).then(r => r.data),
  markDelivered: (id: number, proof?: { proofPhotoUrl?: string; codCollected?: boolean }) =>
    api.put(`/freelance/orders/${id}/delivered`, proof || {}).then(r => r.data),

  getEarnings: () => api.get('/freelance/earnings').then(r => r.data),
};
