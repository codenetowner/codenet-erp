import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const { driver, company, role, logout } = useAuthStore();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) logout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const isCompany = role === 'company';
  const displayName = isCompany ? company?.name : driver?.name;

  const infoRows = isCompany
    ? [
        { icon: 'call-outline', label: 'Phone', value: company?.phone },
        { icon: 'mail-outline', label: 'Email', value: company?.email || 'Not set' },
        { icon: 'business-outline', label: 'Account Type', value: 'Delivery Company' },
      ]
    : [
        { icon: 'call-outline', label: 'Phone', value: driver?.phone },
        { icon: 'mail-outline', label: 'Email', value: driver?.email || 'Not set' },
        { icon: 'car-outline', label: 'Vehicle', value: driver?.vehicleType || 'Car' },
        { icon: 'card-outline', label: 'Plate', value: driver?.vehiclePlate || 'Not set' },
      ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Avatar & Name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name={isCompany ? 'business' : 'person'} size={36} color={colors.primary} />
        </View>
        <Text style={styles.name}>{displayName || 'User'}</Text>
        {!isCompany && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.ratingText}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.ratingLabel}> · {driver?.totalDeliveries || 0} deliveries</Text>
          </View>
        )}
        {isCompany && (
          <Text style={styles.roleBadge}>Delivery Company</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.section}>
        {infoRows.map((row) => (
          <View key={row.label} style={styles.infoRow}>
            <Ionicons name={row.icon as any} size={18} color={colors.textMuted} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Stats (driver only) */}
      {!isCompany && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driver?.totalDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>${(driver?.totalEarnings || 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  ratingText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gold, marginLeft: 4 },
  ratingLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text, marginTop: 1 },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  roleBadge: {
    fontSize: fontSize.sm, color: colors.primary, fontWeight: '600',
    backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, marginTop: spacing.xs, overflow: 'hidden',
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error + '50',
    backgroundColor: colors.error + '10',
  },
  logoutText: { fontSize: fontSize.md, fontWeight: '600', color: colors.error },
});
