import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('salesman_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('salesman_token');
      localStorage.removeItem('salesman_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const salesmanApi = {
  // Auth
  login: (username: string, password: string) =>
    api.post('/auth/salesman/login', { username, password }),

  // Dashboard
  getDashboard: () => api.get('/salesman/dashboard'),

  // Products
  getProducts: (params?: { search?: string; categoryId?: number }) =>
    api.get('/salesman/products', { params }),
  getProduct: (id: number) => api.get(`/salesman/products/${id}`),
  getCategories: () => api.get('/salesman/categories'),

  // Customers
  getCustomers: (params?: { search?: string }) =>
    api.get('/salesman/customers', { params }),
  getCustomer: (id: number) => api.get(`/salesman/customers/${id}`),
  getCustomerPrices: (customerId: number) => api.get(`/salesman/customers/${customerId}/prices`),
  createCustomer: (data: CreateCustomerData) =>
    api.post('/salesman/customers', data),

  // Leads
  getLeads: (params?: { status?: string }) =>
    api.get('/salesman/leads', { params }),
  createLead: (data: CreateLeadData) => api.post('/salesman/leads', data),

  // Tasks
  getTasks: (params?: { status?: string; date?: string }) =>
    api.get('/salesman/tasks', { params }),
  getTask: (id: number) => api.get(`/salesman/tasks/${id}`),
  createTask: (data: CreateTaskData) => api.post('/salesman/tasks', data),
  markTaskVisited: (id: number) => api.put(`/salesman/tasks/${id}/visited`),

  // Profile
  getProfile: () => api.get('/salesman/profile'),
};

export interface CreateCustomerData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  customerType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
}

export interface CreateLeadData {
  businessName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  businessType?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateTaskData {
  customerId: number;
  taskType?: string;
  scheduledDate?: string;
  priority?: string;
  notes?: string;
  discountPercent?: number;
  extraCharge?: number;
  items?: {
    productId: number;
    quantity: number;
    unitPrice?: number;
    isBonus?: boolean;
  }[];
}

export default api;
