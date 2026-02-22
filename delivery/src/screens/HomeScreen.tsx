import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { driverApi } from '../api/driver';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { driver, setDriver } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await driverApi.getDashboard();
      setDashboard(data);
      if (data.driver) setDriver(data.driver);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (!driver?.isOnline) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }

      const res = await driverApi.toggleOnline(!driver?.isOnline, lat, lng);
      setDriver({ isOnline: res.isOnline });
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(false);
    }
  };

  const isOnline = driver?.isOnline || false;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driver?.name?.split(' ')[0] || 'Driver'}</Text>
          <Text style={styles.subGreeting}>{isOnline ? 'You are online' : 'You are offline'}</Text>
        </View>
        <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
      </View>

      {/* Online Toggle */}
      <TouchableOpacity
        style={[styles.toggleBtn, isOnline ? styles.toggleOnline : styles.toggleOffline]}
        onPress={handleToggleOnline}
        disabled={toggling}
        activeOpacity={0.8}
      >
        <Ionicons name={isOnline ? 'power' : 'power-outline'} size={28} color={isOnline ? colors.success : colors.textMuted} />
        <Text style={[styles.toggleText, isOnline && { color: colors.success }]}>
          {toggling ? 'Switching...' : isOnline ? 'Go Offline' : 'Go Online'}
        </Text>
      </TouchableOpacity>

      {/* Today's Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={styles.statValue}>{dashboard?.todayDelivered || 0}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color={colors.gold} />
          <Text style={styles.statValue}>${(dashboard?.todayEarnings || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bicycle" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{dashboard?.activeOrders || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('OrdersTab', { screen: 'AvailableOrders' })}>
            <View style={[styles.actionIcon, { backgroundColor: '#4F46E520' }]}>
              <Ionicons name="list" size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Available</Text>
            {dashboard?.availableOrders > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dashboard.availableOrders}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('OrdersTab', { screen: 'MyOrders' })}>
            <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="bag-handle" size={22} color={colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('EarningsTab')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="wallet" size={22} color={colors.gold} />
            </View>
            <Text style={styles.actionLabel}>Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Time</Text>
        <View style={styles.overallCard}>
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>Total Deliveries</Text>
            <Text style={styles.overallValue}>{driver?.totalDeliveries || 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>Total Earnings</Text>
            <Text style={[styles.overallValue, { color: colors.success }]}>${(driver?.totalEarnings || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>Rating</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.overallValue}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.lg,
  },
  greeting: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  dotOnline: { backgroundColor: colors.online },
  dotOffline: { backgroundColor: colors.offline },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    marginHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 2,
  },
  toggleOnline: { borderColor: colors.success, backgroundColor: colors.success + '15' },
  toggleOffline: { borderColor: colors.surfaceLight, backgroundColor: colors.surface },
  toggleText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textMuted },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, marginTop: spacing.xl,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, position: 'relative',
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs,
  },
  actionLabel: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textSecondary },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: colors.error, width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  overallCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  overallRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  overallLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  overallValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
});
