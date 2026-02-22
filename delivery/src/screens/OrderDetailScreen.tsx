import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, TextInput, Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { driverApi } from '../api/driver';

export default function OrderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);

  const load = async () => {
    try {
      const data = await driverApi.getOrderDetail(orderId);
      setOrder(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orderId]);

  const handlePickedUp = async () => {
    setActionLoading(true);
    try {
      await driverApi.markPickedUp(orderId);
      Alert.alert('Picked Up', 'Order marked as picked up. Navigate to customer.');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    } finally { setActionLoading(false); }
  };

  const handleDelivered = async () => {
    // For COD orders, must confirm cash collection
    const isCod = order?.paymentMethod === 'cod';
    if (isCod && !codConfirmed) {
      Alert.alert('COD Required', 'Please confirm you collected the cash payment before marking as delivered.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await driverApi.markDelivered(orderId, {
        proofPhotoUrl: proofUrl.trim() || undefined,
        codCollected: codConfirmed,
      });
      Alert.alert('Delivered!', `Earned $${res.deliveryFee?.toFixed(2)} for this delivery.${res.codCollected ? '\nCash collected.' : ''}`);
      setShowDeliveryForm(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    } finally { setActionLoading(false); }
  };

  const callNumber = (phone: string) => Linking.openURL(`tel:${phone}`);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, marginTop: spacing.md }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor: Record<string, string> = {
    delivering: colors.primary, delivered: colors.success, cancelled: colors.error,
    confirmed: colors.warning, preparing: colors.gold, pending: colors.textMuted,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={[styles.statusBar, { backgroundColor: (statusColor[order.status] || colors.textMuted) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[order.status] || colors.textMuted }]}>
            {order.status?.toUpperCase()}
          </Text>
        </View>

        {/* Store Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup From</Text>
          <View style={styles.infoCard}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.infoName}>{order.storeName}</Text>
              {order.storeAddress && <Text style={styles.infoSub}>{order.storeAddress}</Text>}
            </View>
            {order.storePhone && (
              <TouchableOpacity onPress={() => callNumber(order.storePhone)} style={styles.callBtn}>
                <Ionicons name="call" size={16} color={colors.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliver To</Text>
          <View style={styles.infoCard}>
            <Ionicons name="location" size={20} color={colors.error} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.infoName}>{order.customerName || 'Customer'}</Text>
              {order.deliveryAddress && <Text style={styles.infoSub}>{order.deliveryAddress}</Text>}
            </View>
            {order.customerPhone && (
              <TouchableOpacity onPress={() => callNumber(order.customerPhone)} style={styles.callBtn}>
                <Ionicons name="call" size={16} color={colors.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>${item.total?.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.subtotal?.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>${order.deliveryFee?.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700', color: colors.text }]}>Total</Text>
              <Text style={[styles.summaryValue, { fontWeight: '700', fontSize: fontSize.lg }]}>${order.total?.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment</Text>
              <Text style={styles.summaryValue}>{order.paymentMethod?.toUpperCase()} — {order.paymentStatus}</Text>
            </View>
          </View>
        </View>

        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {order.status === 'delivering' && !showDeliveryForm && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.deliveredBtn} onPress={() => setShowDeliveryForm(true)} activeOpacity={0.8}>
            <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Complete Delivery</Text>
          </TouchableOpacity>
        </View>
      )}
      {order.status === 'delivering' && showDeliveryForm && (
        <View style={styles.deliveryForm}>
          <Text style={styles.formTitle}>Delivery Confirmation</Text>

          {order.paymentMethod === 'cod' && (
            <View style={styles.codRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.codLabel}>Cash Collected (COD)</Text>
                <Text style={styles.codAmount}>Amount: ${order.total?.toFixed(2)}</Text>
              </View>
              <Switch
                value={codConfirmed}
                onValueChange={setCodConfirmed}
                trackColor={{ false: colors.border, true: colors.success + '80' }}
                thumbColor={codConfirmed ? colors.success : colors.textMuted}
              />
            </View>
          )}

          <Text style={styles.formLabel}>Proof Photo URL (optional)</Text>
          <TextInput
            style={styles.formInput}
            value={proofUrl}
            onChangeText={setProofUrl}
            placeholder="Paste delivery photo URL..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <View style={styles.formBtnRow}>
            <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowDeliveryForm(false)}>
              <Text style={styles.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.formSubmitBtn} onPress={handleDelivered} disabled={actionLoading} activeOpacity={0.8}>
              {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : (
                <Text style={styles.formSubmitText}>Confirm Delivered</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {(order.status === 'confirmed' || order.status === 'preparing') && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.pickedUpBtn} onPress={handlePickedUp} disabled={actionLoading} activeOpacity={0.8}>
            {actionLoading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="bag-check" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>Mark as Picked Up</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMuted, fontSize: fontSize.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, paddingBottom: 100 },
  statusBar: {
    alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  statusText: { fontSize: fontSize.md, fontWeight: '700' },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  infoName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  infoSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemName: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  itemQty: { fontSize: fontSize.sm, color: colors.textMuted, marginHorizontal: spacing.md },
  itemPrice: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.sm, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  pickedUpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: borderRadius.md,
  },
  deliveredBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, paddingVertical: spacing.lg, borderRadius: borderRadius.md,
  },
  actionBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
  deliveryForm: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  codRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.warning + '15', padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.warning + '40',
  },
  codLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  codAmount: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  formLabel: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  formInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md,
  },
  formBtnRow: { flexDirection: 'row', gap: spacing.sm },
  formCancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.border, alignItems: 'center',
  },
  formCancelText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  formSubmitBtn: {
    flex: 2, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.success, alignItems: 'center',
  },
  formSubmitText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '700' },
});
