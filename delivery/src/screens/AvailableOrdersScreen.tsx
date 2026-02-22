import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { driverApi } from '../api/driver';

export default function AvailableOrdersScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await driverApi.getAvailableOrders();
      setOrders(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAccept = async (id: number) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Accept Order: Are you sure you want to accept this order?')) return;
      try {
        await driverApi.acceptOrder(id);
        window.alert('Order accepted! Check My Orders.');
        load();
      } catch (err: any) {
        window.alert(err.response?.data?.message || 'Failed to accept.');
      }
    } else {
      Alert.alert('Accept Order', 'Are you sure you want to accept this order?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept', onPress: async () => {
            try {
              await driverApi.acceptOrder(id);
              Alert.alert('Accepted', 'Order accepted! Check My Orders.');
              load();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to accept.');
            }
          }
        },
      ]);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNum}>#{item.orderNumber}</Text>
          <Text style={styles.storeName}>{item.storeName}</Text>
        </View>
        <Text style={styles.total}>${item.total?.toFixed(2)}</Text>
      </View>

      {item.storeAddress && (
        <View style={styles.addressRow}>
          <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
          <Text style={styles.addressText} numberOfLines={1}>{item.storeAddress}</Text>
        </View>
      )}
      {item.deliveryAddress && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={styles.addressText} numberOfLines={1}>{item.deliveryAddress}</Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.itemCount} items</Text>
        <Text style={styles.metaText}>Fee: ${item.deliveryFee?.toFixed(2)}</Text>
        {item.distanceKm != null && (
          <View style={styles.distBadge}>
            <Ionicons name="navigate" size={10} color={colors.primary} />
            <Text style={styles.distText}>{item.distanceKm} km</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
        <Text style={styles.acceptBtnText}>Accept Order</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <TouchableOpacity onPress={load}><Ionicons name="refresh" size={22} color={colors.primary} /></TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={colors.surfaceLight} />
              <Text style={styles.emptyText}>No available orders right now</Text>
              <Text style={styles.emptyHint}>Pull down to refresh</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  list: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  orderNum: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  storeName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  total: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  addressText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.sm, marginBottom: spacing.md,
  },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  distText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  acceptBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '700' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  emptyHint: { fontSize: fontSize.xs, color: colors.surfaceLight, marginTop: spacing.xs },
});
