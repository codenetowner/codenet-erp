import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, TextInput, ScrollView, Platform, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { marketplaceApi, StoreProduct, StoreCategory2, StoreInfo } from '../api/marketplace';
import { useCartStore } from '../stores/cartStore';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type RouteType = RouteProp<HomeStackParamList, 'Store'>;
const { width } = Dimensions.get('window');

export default function StoreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { companyId } = route.params;

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [categories, setCategories] = useState<StoreCategory2[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const allItems = useCartStore((s) => s.items);
  const cartItems = useMemo(() => allItems.filter((i) => i.companyId === companyId), [allItems, companyId]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cartItems]);

  const loadStore = useCallback(async () => {
    try {
      const [info, cats, prods] = await Promise.all([
        marketplaceApi.getStoreInfo(companyId),
        marketplaceApi.getStoreCategories(companyId),
        marketplaceApi.getStoreProducts(companyId),
      ]);
      setStoreInfo(info);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load store:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadStore(); }, [loadStore]);

  const loadProducts = useCallback(async () => {
    try {
      const prods = await marketplaceApi.getStoreProducts(companyId, {
        search: search || undefined,
        categoryId: selectedCat || undefined,
      });
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [companyId, search, selectedCat]);

  useEffect(() => {
    if (!loading) loadProducts();
  }, [search, selectedCat]);

  const getCartQty = (productId: number, unitType: string) => {
    const item = cartItems.find((i) => i.productId === productId && i.unitType === unitType);
    return item?.quantity || 0;
  };

  const handleAdd = (product: StoreProduct, unitType: string, price: number) => {
    addItem({
      productId: product.id,
      companyId,
      name: product.name,
      imageUrl: product.imageUrl,
      unitType,
      unitPrice: price,
      currency: product.currency,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const themeColor = storeInfo?.storeThemeColor || colors.primary;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {storeInfo?.storeBannerUrl || storeInfo?.logoUrl ? (
            <Image 
              source={{ uri: storeInfo?.storeBannerUrl || storeInfo?.logoUrl }} 
              style={styles.heroImage} 
            />
          ) : (
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.heroImage} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroOverlay}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            {/* Store Info */}
            <View style={styles.heroContent}>
              <View style={styles.heroBadges}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{storeInfo?.address || 'General Store'}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{storeInfo?.name}</Text>
              <View style={styles.heroMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#818CF8" />
                  <Text style={styles.metaText}>2.5 km</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#34D399" />
                  <Text style={styles.metaTextGreen}>
                    {storeInfo?.deliveryFee ? `$${storeInfo.deliveryFee} Delivery` : 'Free Delivery'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroActionBtn}>
                <Ionicons name="heart-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => navigation.navigate('Reviews', { companyId, storeName: storeInfo?.name || '' })}
              >
                <Ionicons name="star" size={18} color="#FFF" />
                <Text style={styles.whatsappBtnText}>Reviews</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search products..."
              style={styles.searchInput}
              placeholderTextColor={colors.textMuted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filters */}
        {categories.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryFilters}
          >
            <TouchableOpacity
              style={[styles.filterBtn, selectedCat === null && styles.filterBtnActive]}
              onPress={() => setSelectedCat(null)}
            >
              <Text style={[styles.filterBtnText, selectedCat === null && styles.filterBtnTextActive]}>
                All Products
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterBtn, selectedCat === cat.id && styles.filterBtnActive]}
                onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
              >
                <Text style={[styles.filterBtnText, selectedCat === cat.id && styles.filterBtnTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Store Products</Text>
          <Ionicons name="sparkles" size={18} color="#F59E0B" />
        </View>

        {/* Products Grid */}
        {products.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>Try a different category or search term</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((item) => {
              const qty = getCartQty(item.id, item.baseUnit);
              return (
                <View key={item.id} style={styles.productCard}>
                  <TouchableOpacity style={styles.favoriteBtn}>
                    <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.productImageContainer}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    {item.categoryName && (
                      <View style={styles.productCatBadge}>
                        <Ionicons name="storefront" size={10} color={colors.primary} />
                        <Text style={styles.productCatText}>{item.categoryName}</Text>
                      </View>
                    )}
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.productPriceRow}>
                      <View>
                        <Text style={styles.productCurrency}>{item.currency}</Text>
                        <Text style={styles.productPrice}>${item.retailPrice.toFixed(2)}</Text>
                      </View>
                      {qty === 0 ? (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleAdd(item, item.baseUnit, item.retailPrice)}
                        >
                          <Ionicons name="add" size={18} color="#FFF" />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.qtyControl}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateQuantity(item.id, item.baseUnit, qty - 1)}
                          >
                            <Ionicons name="remove" size={14} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateQuantity(item.id, item.baseUnit, qty + 1)}
                          >
                            <Ionicons name="add" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => (navigation as any).navigate('CartTab', { screen: 'Cart' })}
          activeOpacity={0.95}
        >
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.cartBarGradient}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartItems.reduce((s, i) => s + i.quantity, 0)}
              </Text>
            </View>
            <Text style={styles.cartBarText}>View Cart</Text>
            <Text style={styles.cartBarTotal}>${cartTotal.toFixed(2)}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  heroContainer: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40,
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  backBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  heroContent: { marginBottom: 16 },
  heroBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.text },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  categoryBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 12 },
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    alignSelf: 'flex-start',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)' },
  metaText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  metaTextGreen: { color: '#34D399', fontSize: 13, fontWeight: '600' },
  heroActions: { flexDirection: 'row', gap: 12, alignSelf: 'flex-end' },
  heroActionBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
  },
  whatsappBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  searchContainer: { padding: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },

  categoryFilters: { paddingHorizontal: 12, paddingBottom: 16 },
  filterBtn: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginHorizontal: 4,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  filterBtnTextActive: { color: '#FFF' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: colors.borderLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted },

  productsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
  },
  productCard: {
    width: (width - 48) / 2, margin: 6,
    backgroundColor: colors.surface, borderRadius: 20, padding: 12,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  favoriteBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  productImageContainer: {
    aspectRatio: 1, borderRadius: 14, backgroundColor: colors.borderLight,
    marginBottom: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  productInfo: {},
  productCatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  productCatText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  productName: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18, marginBottom: 8 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productCurrency: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  productPrice: { fontSize: 15, fontWeight: '800', color: colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.borderLight, borderRadius: 10, padding: 4,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '800', color: colors.text, minWidth: 20, textAlign: 'center' },

  cartBar: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  cartBarGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cartBarText: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 12 },
  cartBarTotal: { color: '#FFF', fontSize: 16, fontWeight: '800', marginRight: 8 },
});
