import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { marketplaceApi, StoreProduct, StoreCategory2, StoreInfo } from '../api/marketplace';
import { useCartStore } from '../stores/cartStore';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type RouteType = RouteProp<HomeStackParamList, 'Store'>;

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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {storeInfo?.logoUrl ? (
            <Image source={{ uri: storeInfo.logoUrl }} style={styles.headerLogo} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{storeInfo?.name}</Text>
            {storeInfo?.storeDescription && (
              <Text style={styles.headerDesc} numberOfLines={1}>{storeInfo.storeDescription}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.reviewsBtn}
            onPress={() => navigation.navigate('Reviews', { companyId, storeName: storeInfo?.name || '' })}
          >
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.reviewsBtnText}>Reviews</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            style={styles.searchText}
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <View style={styles.catRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRowContent}>
            <TouchableOpacity
              style={[styles.catTab, selectedCat === null && styles.catTabActive]}
              onPress={() => setSelectedCat(null)}
            >
              <Text style={[styles.catTabText, selectedCat === null && styles.catTabTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catTab, selectedCat === cat.id && styles.catTabActive]}
                onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
              >
                <Text style={[styles.catTabText, selectedCat === cat.id && styles.catTabTextActive]}>
                  {cat.name} ({cat.productCount})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {products.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <View style={styles.productsWrap}>
            {products.map((item) => {
              const qty = getCartQty(item.id, item.baseUnit);
              return (
                <View key={item.id} style={styles.productCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    {item.categoryName && (
                      <Text style={styles.productCat}>{item.categoryName}</Text>
                    )}
                    <Text style={styles.productPrice}>
                      {item.currency} {item.retailPrice.toFixed(2)}
                    </Text>
                    {item.secondUnit && item.boxRetailPrice ? (
                      <Text style={styles.productBoxPrice}>
                        {item.secondUnit}: {item.currency} {item.boxRetailPrice.toFixed(2)}
                      </Text>
                    ) : null}

                    {qty === 0 ? (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: themeColor }]}
                        onPress={() => handleAdd(item, item.baseUnit, item.retailPrice)}
                      >
                        <Ionicons name="add" size={18} color="#FFF" />
                        <Text style={styles.addBtnText}>Add</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { borderColor: themeColor }]}
                          onPress={() => updateQuantity(item.id, item.baseUnit, qty - 1)}
                        >
                          <Ionicons name="remove" size={16} color={themeColor} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { borderColor: themeColor }]}
                          onPress={() => updateQuantity(item.id, item.baseUnit, qty + 1)}
                        >
                          <Ionicons name="add" size={16} color={themeColor} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Cart Bar */}
      {cartItems.length > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { backgroundColor: themeColor }]}
          onPress={() => (navigation as any).navigate('CartTab', { screen: 'Cart' })}
          activeOpacity={0.9}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartItems.reduce((s, i) => s + i.quantity, 0)}
            </Text>
          </View>
          <Text style={styles.cartBarText}>View Cart</Text>
          <Text style={styles.cartBarTotal}>${cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 48, paddingBottom: spacing.lg,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.md },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerLogo: { width: 36, height: 36, borderRadius: borderRadius.md, marginRight: spacing.sm },
  headerName: { fontSize: fontSize.lg, fontWeight: '700', color: '#FFF' },
  headerDesc: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)' },
  searchRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.borderLight, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, height: 40,
  },
  searchText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  catRow: {
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    height: 48, justifyContent: 'center',
  },
  catRowContent: {
    paddingHorizontal: spacing.lg, alignItems: 'center', height: 48,
    flexDirection: 'row',
  },
  catTab: {
    paddingHorizontal: 14, height: 32, justifyContent: 'center', alignItems: 'center',
    borderRadius: 16, marginRight: 8,
    backgroundColor: colors.borderLight,
  },
  catTabActive: { backgroundColor: colors.primary },
  catTabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  catTabTextActive: { color: '#FFF' },
  grid: { padding: spacing.lg, paddingBottom: 100, maxWidth: 900, alignSelf: 'center', width: '100%' },
  productsWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  productCard: {
    width: '48%', marginHorizontal: '1%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  productImage: { width: '100%', height: 140, backgroundColor: colors.borderLight },
  productImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: spacing.md },
  productName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, lineHeight: 18 },
  productCat: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  productPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginTop: 6 },
  productBoxPrice: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: borderRadius.sm, marginTop: spacing.sm,
  },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm, gap: spacing.md,
  },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    paddingBottom: 32, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
  },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)', width: 28, height: 28,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '700' },
  cartBarText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  cartBarTotal: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
  reviewsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  reviewsBtnText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
});
