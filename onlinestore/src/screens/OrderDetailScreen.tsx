import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { ordersApi, OrderDetail } from '../api/orders';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
type RouteType = RouteProp<ProfileStackParamList, 'OrderDetail'>;

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed by Store',
  preparing: 'Being Prepared',
  delivering: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await ordersApi.getOrderDetail(orderId);
      setOrder(data);
    } catch {
      Alert.alert('Error', 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const currentStepIndex = order
    ? (order.status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(order.status))
    : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <TouchableOpacity onPress={loadOrder} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Timeline */}
        {order.status !== 'cancelled' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <View key={step} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotActive,
                        isCurrent && styles.timelineDotCurrent,
                      ]}>
                        {isCompleted && <Ionicons name="checkmark" size={12} color="#FFF" />}
                      </View>
                      {index < STATUS_STEPS.length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineActive,
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineLabel,
                        isCompleted && styles.timelineLabelActive,
                        isCurrent && styles.timelineLabelCurrent,
                      ]}>
                        {STATUS_LABELS[step]}
                      </Text>
                      {isCurrent && step === 'pending' && (
                        <Text style={styles.timelineHint}>{formatDate(order.createdAt)}</Text>
                      )}
                      {isCurrent && step === 'delivered' && order.deliveredAt && (
                        <Text style={styles.timelineHint}>{formatDate(order.deliveredAt)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.cancelledBox}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              {order.cancelReason && (
                <Text style={styles.cancelledReason}>{order.cancelReason}</Text>
              )}
              {order.cancelledAt && (
                <Text style={styles.cancelledDate}>{formatDate(order.cancelledAt)}</Text>
              )}
            </View>
          </View>
        )}

        {/* Store Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store</Text>
          <View style={styles.card}>
            <View style={styles.storeRow}>
              <View style={styles.storeLogo}>
                <Ionicons name="storefront" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeNameText}>{order.storeName}</Text>
                {order.storePhone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${order.storePhone}`)}
                    style={styles.phoneRow}
                  >
                    <Ionicons name="call-outline" size={14} color={colors.primary} />
                    <Text style={styles.phoneText}>{order.storePhone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Info */}
        {order.deliveryType === 'delivery' && order.deliveryAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.card}>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          <View style={styles.card}>
            {order.items.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>${item.total.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
            </View>
            {order.deliveryFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>${order.deliveryFee.toFixed(2)}</Text>
              </View>
            )}
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>-${order.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment</Text>
              <Text style={styles.summaryValue}>
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod || 'COD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg },
  errorText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  retryBtn: { marginTop: spacing.lg, padding: spacing.md },
  retryBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },

  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },

  // Timeline
  timeline: {},
  timelineStep: { flexDirection: 'row', minHeight: 48 },
  timelineLeft: { width: 28, alignItems: 'center' },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.success, borderColor: colors.success,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2,
  },
  timelineLineActive: { backgroundColor: colors.success },
  timelineContent: { flex: 1, marginLeft: spacing.sm, paddingBottom: spacing.md },
  timelineLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  timelineLabelActive: { color: colors.text },
  timelineLabelCurrent: { fontWeight: '700', color: colors.primary },
  timelineHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Cancelled
  cancelledBox: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', padding: spacing.lg,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: '#FECACA',
  },
  cancelledTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.error },
  cancelledReason: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  cancelledDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },

  // Store
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  storeLogo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  storeNameText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneText: { fontSize: fontSize.sm, color: colors.primary },

  // Address
  addressRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  addressText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  itemQtyBadge: {
    backgroundColor: colors.borderLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.sm, minWidth: 32, alignItems: 'center',
  },
  itemQtyText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  itemName: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  itemPrice: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.sm, color: colors.text },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },

  // Notes
  notesText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
});
