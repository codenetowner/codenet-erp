import api from './client';

export interface StoreCategory {
  id: number;
  name: string;
  nameAr?: string;
  icon?: string;
  imageUrl?: string;
  storeCount: number;
}

export interface Store {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  storeDescription?: string;
  storeBannerUrl?: string;
  storeThemeColor?: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  isPremium: boolean;
  premiumTier?: string;
  whatsappNumber?: string;
  storeLat?: number;
  storeLng?: number;
  categories: string[];
  rating?: number;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  companyId?: number;
}

export interface StoreProduct {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  categoryName?: string;
  imageUrl?: string;
  baseUnit: string;
  secondUnit?: string;
  unitsPerSecond?: number;
  currency: string;
  retailPrice: number;
  boxRetailPrice?: number;
}

export interface StoreCategory2 {
  id: number;
  name: string;
  productCount: number;
}

export interface StoreInfo {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  whatsappNumber?: string;
  storeDescription?: string;
  storeBannerUrl?: string;
  storeThemeColor?: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrderAmount: number;
}

export interface NearbyStore {
  id: number;
  name: string;
  logoUrl?: string;
  storeDescription?: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  isPremium: boolean;
  premiumTier?: string;
  phone?: string;
  address?: string;
  categories: string[];
  distanceKm: number;
}

export const marketplaceApi = {
  getCategories: () =>
    api.get<StoreCategory[]>('/marketplace/categories').then((r) => r.data),

  getStores: (params?: { categoryId?: number; search?: string; lat?: number; lng?: number }) =>
    api.get<Store[]>('/marketplace/stores', { params }).then((r) => r.data),

  getFeaturedStores: () =>
    api.get<Store[]>('/marketplace/stores/featured').then((r) => r.data),

  getBanners: () =>
    api.get<Banner[]>('/marketplace/banners').then((r) => r.data),

  trackClick: (adId: number) =>
    api.post(`/marketplace/banners/${adId}/click`),

  // Store-specific (existing StoreController)
  getStoreInfo: (companyId: number) =>
    api.get<StoreInfo>(`/store/${companyId}/info`).then((r) => r.data),

  getStoreCategories: (companyId: number) =>
    api.get<StoreCategory2[]>(`/store/${companyId}/categories`).then((r) => r.data),

  getStoreProducts: (companyId: number, params?: { search?: string; categoryId?: number }) =>
    api.get<StoreProduct[]>(`/store/${companyId}/products`, { params }).then((r) => r.data),

  getNearbyStores: (lat: number, lng: number, radiusKm?: number) =>
    api.get<NearbyStore[]>('/marketplace/stores/nearby', { params: { lat, lng, radiusKm: radiusKm || 50 } }).then((r) => r.data),

  // Reviews
  getReviews: (companyId: number, page = 1) =>
    api.get(`/marketplace/stores/${companyId}/reviews`, { params: { page, limit: 20 } }).then((r) => r.data),

  getReviewSummary: (companyId: number) =>
    api.get(`/marketplace/stores/${companyId}/reviews/summary`).then((r) => r.data),

  submitReview: (companyId: number, data: { rating: number; comment?: string; guestName?: string; orderId?: number }) =>
    api.post(`/marketplace/stores/${companyId}/reviews`, data).then((r) => r.data),
};
