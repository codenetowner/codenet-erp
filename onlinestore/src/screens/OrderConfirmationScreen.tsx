import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { CartStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CartStackParamList>;
type RouteType = RouteProp<CartStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { orderId, orderNumber } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={48} color="#FFF" />
        </View>
      </View>

      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>
        Your order has been placed successfully and is being reviewed by the store.
      </Text>

      {/* Order Info Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Order Number</Text>
          <Text style={styles.cardValue}>{orderNumber}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Info text */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          You will receive updates as the store confirms and prepares your order. Check "My Orders" in your profile to track the status.
        </Text>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => {
          navigation.getParent()?.navigate('ProfileTab', {
            screen: 'OrderDetail',
            params: { orderId },
          });
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" size={20} color="#FFF" />
        <Text style={styles.primaryBtnText}>View Order Details</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => {
          navigation.getParent()?.navigate('HomeTab', { screen: 'Home' });
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="storefront-outline" size={20} color={colors.primary} />
        <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 80, alignItems: 'center' },
  iconContainer: { marginBottom: spacing.xl },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  title: {
    fontSize: fontSize.xxl, fontWeight: '700', color: colors.text,
    marginBottom: spacing.sm, textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cardLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  statusBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: { fontSize: fontSize.sm, fontWeight: '600', color: '#92400E' },
  infoBox: {
    width: '100%', flexDirection: 'row', gap: spacing.sm,
    backgroundColor: '#EFF6FF', padding: spacing.lg,
    borderRadius: borderRadius.md, marginBottom: spacing.xxl,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
  },
  primaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    paddingVertical: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md,
  },
  primaryBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  secondaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.surface,
    paddingVertical: spacing.lg, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  secondaryBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
});
