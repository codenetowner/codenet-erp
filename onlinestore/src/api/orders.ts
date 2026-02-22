import api from './client';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  unitType: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  companyId: number;
  storeName: string;
  storeLogoUrl?: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  companyId: number;
  storeName?: string;
  storeLogoUrl?: string;
  storePhone?: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryType: string;
  deliveryAddress?: string;
  notes?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  items: OrderItem[];
}

export const ordersApi = {
  getOrdersByPhone: (phone: string) =>
    api.get<OrderSummary[]>('/store/orders/by-phone', { params: { phone } }).then((r) => r.data),

  getOrderDetail: (orderId: number) =>
    api.get<OrderDetail>(`/store/orders/${orderId}`).then((r) => r.data),
};
