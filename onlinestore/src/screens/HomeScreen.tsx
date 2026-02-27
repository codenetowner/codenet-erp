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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { marketplaceApi, StoreCategory, Store, Banner, NearbyStore } from '../api/marketplace';
import * as Location from 'expo-location';
import type { HomeStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
const { width } = Dimensions.get('window');

const CATEGORY_COLORS = [
  { bg: ['#34D399', '#10B981'], shadow: '#10B981' },
  { bg: ['#60A5FA', '#3B82F6'], shadow: '#3B82F6' },
  { bg: ['#FB923C', '#F97316'], shadow: '#F97316' },
  { bg: ['#FB7185', '#F43F5E'], shadow: '#F43F5E' },
  { bg: ['#A78BFA', '#8B5CF6'], shadow: '#8B5CF6' },
  { bg: ['#FBBF24', '#F59E0B'], shadow: '#F59E0B' },
];

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
        <View style={styles.headerLeft}>
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.logoBox}>
            <Ionicons name="storefront" size={22} color="#FFF" />
          </LinearGradient>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerLabel}>Delivering to</Text>
            <TouchableOpacity style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.headerLocation}>Your Location</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <TouchableOpacity onPress={() => navigation.navigate('Search')} activeOpacity={0.8} style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search for products, stores...</Text>
      </TouchableOpacity>

      {/* Banner Carousel */}
      {banners.length > 0 && (
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: bannerIndex * (width - 32), y: 0 }}
            decelerationRate="fast"
            snapToInterval={width - 32}
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
                activeOpacity={0.95}
                style={styles.bannerCard}
              >
                <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bannerOverlay}>
                  <View style={styles.bannerBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.bannerBadgeText}>Featured</Text>
                  </View>
                  <Text style={styles.bannerTitle}>{banner.title || 'Special Offer'}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle || 'Tap to explore'}</Text>
                </LinearGradient>
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
        <View style={styles.sectionHeader}>
          <Ionicons name="compass" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Explore Categories</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categories.map((cat, index) => {
            const colorSet = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('StoreList', { categoryId: cat.id, categoryName: cat.name })}
                activeOpacity={0.8}
              >
                <LinearGradient colors={colorSet.bg as any} style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>{cat.icon || '🏪'}</Text>
                </LinearGradient>
                <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Premium Stores */}
      {featuredStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitleGold}>Premium Stores</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesRow}>
            {featuredStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.premiumStoreCard}
                onPress={() => navigation.navigate('Store', { companyId: store.id, storeName: store.name })}
                activeOpacity={0.9}
              >
                <View style={styles.premiumStoreImageContainer}>
                  {store.logoUrl ? (
                    <Image source={{ uri: store.logoUrl }} style={styles.premiumStoreImage} />
                  ) : (
                    <View style={[styles.premiumStoreImage, styles.storePlaceholder]}>
                      <Ionicons name="storefront" size={40} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{store.rating || '4.8'}</Text>
                  </View>
                </View>
                <Text style={styles.premiumStoreName} numberOfLines={1}>{store.name}</Text>
                <Text style={styles.premiumStoreCategory} numberOfLines={1}>{store.categories?.join(', ') || 'General'}</Text>
                <View style={styles.premiumStoreMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                    <Text style={styles.metaText}>2.5 km</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.secondary} />
                    <Text style={styles.metaTextGreen}>
                      {store.deliveryFee > 0 ? `$${store.deliveryFee}` : 'Free'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Near Me */}
      {(nearbyStores.length > 0 || locationLoading) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Near You</Text>
          </View>
          {locationLoading ? (
            <View style={styles.loadingNearby}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Finding nearby stores...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesRow}>
              {nearbyStores.slice(0, 10).map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={styles.nearbyCard}
                  onPress={() => navigation.navigate('Store', { companyId: store.id, storeName: store.name })}
                  activeOpacity={0.8}
                >
                  {store.logoUrl ? (
                    <Image source={{ uri: store.logoUrl }} style={styles.nearbyLogo} />
                  ) : (
                    <View style={[styles.nearbyLogo, styles.storePlaceholder]}>
                      <Ionicons name="storefront" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.nearbyName} numberOfLines={1}>{store.name}</Text>
                  <View style={styles.nearbyDistRow}>
                    <Ionicons name="navigate" size={10} color={colors.primary} />
                    <Text style={styles.nearbyDist}>{store.distanceKm} km</Text>
                  </View>
                  {store.deliveryEnabled && (
                    <Text style={styles.nearbyDelivery}>
                      {store.deliveryFee > 0 ? `$${store.deliveryFee} delivery` : 'Free delivery'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTextContainer: { gap: 2 },
  headerLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLocation: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 3,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },

  bannerContainer: { marginHorizontal: 16, marginBottom: 24 },
  bannerCard: {
    width: width - 32,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  bannerBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  bannerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500', marginTop: 4 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.primary, width: 20 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionTitleGold: { fontSize: 18, fontWeight: '800', color: '#B45309' },

  categoriesRow: { paddingHorizontal: 16 },
  categoryCard: { alignItems: 'center', marginHorizontal: 8, width: 80 },
  categoryIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryEmoji: { fontSize: 28 },
  categoryName: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },

  storesRow: { paddingHorizontal: 16 },
  premiumStoreCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 12,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 5,
  },
  premiumStoreImageContainer: { position: 'relative', marginBottom: 12 },
  premiumStoreImage: { width: '100%', height: 120, borderRadius: 16 },
  storePlaceholder: { backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.text },
  premiumStoreName: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  premiumStoreCategory: { fontSize: 13, fontWeight: '500', color: colors.textMuted, marginBottom: 12 },
  premiumStoreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  metaDivider: { width: 1, height: 16, backgroundColor: colors.border },
  metaText: { fontSize: 12, fontWeight: '700', color: colors.text },
  metaTextGreen: { fontSize: 12, fontWeight: '700', color: colors.secondary },

  loadingNearby: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  nearbyCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  nearbyLogo: { width: 56, height: 56, borderRadius: 28, marginBottom: 10 },
  nearbyName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 6 },
  nearbyDistRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyDist: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  nearbyDelivery: { fontSize: 10, color: colors.secondary, fontWeight: '600', marginTop: 4 },
});
