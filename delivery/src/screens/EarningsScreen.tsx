import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { driverApi } from '../api/driver';

export default function EarningsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await driverApi.getEarnings();
      setData(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const periods = [
    { label: 'Today', earnings: data?.today?.earnings || 0, deliveries: data?.today?.deliveries || 0 },
    { label: 'This Week', earnings: data?.week?.earnings || 0, deliveries: data?.week?.deliveries || 0 },
    { label: 'This Month', earnings: data?.month?.earnings || 0, deliveries: data?.month?.deliveries || 0 },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earnings</Text>
        <Text style={styles.totalValue}>${(data?.totalEarnings || 0).toFixed(2)}</Text>
        <Text style={styles.totalSub}>{data?.totalDeliveries || 0} deliveries completed</Text>
      </View>

      {/* Period Cards */}
      <View style={styles.periodsRow}>
        {periods.map((p) => (
          <View key={p.label} style={styles.periodCard}>
            <Text style={styles.periodLabel}>{p.label}</Text>
            <Text style={styles.periodValue}>${p.earnings.toFixed(2)}</Text>
            <Text style={styles.periodSub}>{p.deliveries} orders</Text>
          </View>
        ))}
      </View>

      {/* Recent Deliveries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        {data?.recentDeliveries?.length > 0 ? (
          data.recentDeliveries.map((d: any) => (
            <View key={d.id} style={styles.deliveryRow}>
              <View style={styles.deliveryIcon}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryStore}>{d.storeName}</Text>
                <Text style={styles.deliveryAddr} numberOfLines={1}>{d.deliveryAddress || d.orderNumber}</Text>
                <Text style={styles.deliveryDate}>
                  {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : ''}
                </Text>
              </View>
              <Text style={styles.deliveryFee}>+${d.deliveryFee?.toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={40} color={colors.surfaceLight} />
            <Text style={styles.emptyText}>No deliveries yet</Text>
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  totalCard: {
    margin: spacing.xl, padding: spacing.xl,
    backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  totalLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  totalValue: { fontSize: 36, fontWeight: '800', color: '#FFF', marginVertical: spacing.xs },
  totalSub: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)' },
  periodsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, marginBottom: spacing.xl,
  },
  periodCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  periodLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  periodValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },
  periodSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md },
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  deliveryIcon: { marginRight: spacing.md },
  deliveryStore: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  deliveryAddr: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  deliveryDate: { fontSize: 10, color: colors.surfaceLight, marginTop: 2 },
  deliveryFee: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
});
