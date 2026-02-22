export type RootTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  StoreList: { categoryId: number; categoryName: string };
  Store: { companyId: number; storeName?: string };
  Search: undefined;
  Reviews: { companyId: number; storeName: string };
};

export type CategoriesStackParamList = {
  Categories: undefined;
  CategoryStores: { categoryId: number; categoryName: string };
  Store: { companyId: number; storeName?: string };
  Reviews: { companyId: number; storeName: string };
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: { companyId: number };
  OrderConfirmation: { orderId: number; orderNumber: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Login: undefined;
  Register: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: number };
  SavedAddresses: undefined;
  Favorites: undefined;
};
