import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { companyApi } from '../api/companyApi';

const statusColors: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#3B82F620', text: '#3B82F6' },
  preparing: { bg: '#F59E0B20', text: '#F59E0B' },
  delivering: { bg: '#8B5CF620', text: '#8B5CF6' },
  delivered: { bg: '#10B98120', text: '#10B981' },
  cancelled: { bg: '#EF444420', text: '#EF4444' },
};

const filters = ['all', 'delivering', 'delivered', 'cancelled'];

export default function CompanyOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await companyApi.getOrders(filter === 'all' ? undefined : filter);
      setOrders(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Orders</Text>
        <Text style={styles.subtitle}>{orders.length} orders</Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); setLoading(true); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        renderItem={({ item: o }) => {
          const sc = statusColors[o.status] || { bg: colors.border, text: colors.textMuted };
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>{o.orderNumber}</Text>
                  <Text style={styles.orderStore}>{o.storeName}</Text>
                  <Text style={styles.orderCustomer}>{o.customerName} • {o.customerPhone}</Text>
                  {o.driverName && (
                    <View style={styles.driverTag}>
                      <Ionicons name="person-outline" size={12} color={colors.primary} />
                      <Text style={styles.driverTagText}>{o.driverName}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>${(o.total ?? 0).toFixed(2)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{o.status}</Text>
                  </View>
                  <Text style={styles.orderDate}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              {o.deliveryAddress && (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.addressText} numberOfLines={1}>{o.deliveryAddress}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  filterBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: '#FFF' },
  list: { padding: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  orderCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderInfo: { flex: 1, marginRight: spacing.md },
  orderNumber: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  orderStore: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginTop: 2 },
  orderCustomer: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  driverTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.xs, backgroundColor: colors.primary + '15',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start',
  },
  driverTagText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  orderRight: { alignItems: 'flex-end' },
  orderTotal: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  orderDate: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  addressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  addressText: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
});
