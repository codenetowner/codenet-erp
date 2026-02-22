import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { marketplaceApi, StoreCategory, Store, Banner, NearbyStore } from '../api/marketplace';
import * as Location from 'expo-location';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [cats, featured, bans] = await Promise.all([
        marketplaceApi.getCategories(),
        marketplaceApi.getFeaturedStores(),
        marketplaceApi.getBanners(),
      ]);
      setCategories(cats);
      setFeaturedStores(featured);
      setBanners(bans);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadNearby = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearby = await marketplaceApi.getNearbyStores(loc.coords.latitude, loc.coords.longitude);
      setNearbyStores(nearby);
    } catch (err) {
      console.error('Failed to load nearby stores:', err);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadNearby();
  }, [loadData, loadNearby]);

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Catalyst</Text>
          <Text style={styles.headerSubtitle}>Discover stores near you</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.searchIconBtn}>
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity onPress={() => navigation.navigate('Search')} activeOpacity={0.8} style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search stores or products...</Text>
      </TouchableOpacity>

      {/* Banner Carousel */}
      {banners.length > 0 && (
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: bannerIndex * (width - 32), y: 0 }}
          >
            {banners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                onPress={() => {
                  marketplaceApi.trackClick(banner.id);
                  if (banner.companyId) {
                    navigation.navigate('Store', { companyId: banner.companyId });
                  }
                }}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: banner.imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {banners.length > 1 && (
            <View style={styles.bannerDots}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingRight: spacing.lg }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('StoreList', { categoryId: item.id, categoryName: item.name })}
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryEmoji}>{item.icon || '🏪'}</Text>
              </View>
              <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.categoryCount}>{item.storeCount} stores</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Near Me */}
      {(nearbyStores.length > 0 || locationLoading) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Near You</Text>
            <Ionicons name="location" size={16} color={colors.primary} />
          </View>
          {locationLoading ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs }}>Finding nearby stores...</Text>
            </View>
          ) : (
            <FlatList
              data={nearbyStores.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingRight: spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.nearbyCard}
                  onPress={() => navigation.navigate('Store', { companyId: item.id, storeName: item.name })}
                  activeOpacity={0.7}
                >
                  {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.nearbyLogo} />
                  ) : (
                    <View style={[styles.nearbyLogo, styles.storeLogoPlaceholder]}>
                      <Ionicons name="storefront" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.nearbyName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.nearbyDistRow}>
                    <Ionicons name="navigate-outline" size={11} color={colors.primary} />
                    <Text style={styles.nearbyDist}>{item.distanceKm} km</Text>
                  </View>
                  {item.deliveryEnabled && (
                    <Text style={styles.nearbyDelivery}>
                      {item.deliveryFee > 0 ? `$${item.deliveryFee} delivery` : 'Free delivery'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Featured Stores */}
      {featuredStores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Stores</Text>
          {featuredStores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={styles.storeCard}
              onPress={() => navigation.navigate('Store', { companyId: store.id, storeName: store.name })}
            >
              <View style={styles.storeCardRow}>
                {store.logoUrl ? (
                  <Image source={{ uri: store.logoUrl }} style={styles.storeLogo} />
                ) : (
                  <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                    <Ionicons name="storefront" size={24} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.storeInfo}>
                  <View style={styles.storeNameRow}>
                    <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                    {store.isPremium && (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="star" size={10} color="#FFF" />
                        <Text style={styles.premiumText}>Premium</Text>
                      </View>
                    )}
                  </View>
                  {store.storeDescription && (
                    <Text style={styles.storeDesc} numberOfLines={1}>{store.storeDescription}</Text>
                  )}
                  <View style={styles.storeMetaRow}>
                    {store.deliveryEnabled && (
                      <View style={styles.metaTag}>
                        <Ionicons name="bicycle-outline" size={12} color={colors.secondary} />
                        <Text style={styles.metaText}>
                          {store.deliveryFee > 0 ? `$${store.deliveryFee} delivery` : 'Free delivery'}
                        </Text>
                      </View>
                    )}
                    {store.categories.length > 0 && (
                      <Text style={styles.metaCategories}>{store.categories.join(' • ')}</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  searchIconBtn: { padding: spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: fontSize.md },
  bannerContainer: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  bannerImage: { width: width - 32, height: 160, borderRadius: borderRadius.lg },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  section: { paddingLeft: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  nearbyCard: {
    width: 130, marginRight: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  nearbyLogo: { width: 48, height: 48, borderRadius: 24, marginBottom: spacing.xs },
  nearbyName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
  nearbyDistRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  nearbyDist: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  nearbyDelivery: { fontSize: 9, color: colors.secondary, marginTop: 2 },
  categoryCard: {
    alignItems: 'center', marginRight: spacing.md,
    width: 80,
  },
  categoryIcon: {
    width: 60, height: 60, borderRadius: borderRadius.lg,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryEmoji: { fontSize: 26 },
  categoryName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
  categoryCount: { fontSize: 10, color: colors.textMuted },
  storeCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    marginRight: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  storeCardRow: { flexDirection: 'row', alignItems: 'center' },
  storeLogo: { width: 50, height: 50, borderRadius: borderRadius.md },
  storeLogoPlaceholder: { backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  storeInfo: { flex: 1, marginLeft: spacing.md },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  storeName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flexShrink: 1 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  premiumText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  storeDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 10, color: colors.secondary, fontWeight: '500' },
  metaCategories: { fontSize: 10, color: colors.textMuted },
});
