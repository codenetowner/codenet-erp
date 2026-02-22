import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { companyApi } from '../api/companyApi';
import { useAuthStore } from '../stores/authStore';

export default function CompanyDashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const company = useAuthStore((s) => s.company);

  const load = useCallback(async () => {
    try {
      const data = await companyApi.getDashboard();
      setStats(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const cards = [
    { label: 'Total Drivers', value: stats?.totalDrivers ?? 0, icon: 'people', color: '#3B82F6' },
    { label: 'Online Now', value: stats?.onlineDrivers ?? 0, icon: 'radio-button-on', color: '#10B981' },
    { label: 'Active Orders', value: stats?.activeOrders ?? 0, icon: 'bicycle', color: '#F59E0B' },
    { label: 'Completed Today', value: stats?.completedToday ?? 0, icon: 'checkmark-circle', color: '#8B5CF6' },
    { label: "Today's Revenue", value: `$${(stats?.todayRevenue ?? 0).toFixed(2)}`, icon: 'cash', color: '#10B981' },
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: 'wallet', color: '#3B82F6' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.companyName}>{company?.name || 'Company'}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((c, i) => (
          <View key={i} style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: c.color + '20' }]}>
              <Ionicons name={c.icon as any} size={22} color={c.color} />
            </View>
            <Text style={styles.cardValue}>{c.value}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Manage your drivers from the Drivers tab. View all orders from the Orders tab.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 56 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.sm, color: colors.textSecondary },
  companyName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '47%', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  cardValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  cardLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginTop: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
});
