import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import api from '../api/client';
import type { CartStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CartStackParamList>;
type RouteType = RouteProp<CartStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { companyId } = route.params;

  const allItems = useCartStore((s) => s.items);
  const clearCompanyItems = useCartStore((s) => s.clearCompanyItems);
  const cartItems = useMemo(() => allItems.filter((i) => i.companyId === companyId), [allItems, companyId]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cartItems]);
  const { user, isGuest } = useAuthStore();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    notes: '',
    deliveryType: 'delivery' as 'delivery' | 'pickup',
  });
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cartTotal;
  const deliveryFee = form.deliveryType === 'delivery' ? 2.00 : 0;
  const total = subtotal + deliveryFee;

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') { window.alert(`${title}\n${msg}`); }
    else { Alert.alert(title, msg); }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showAlert('Missing Info', 'Please enter your name and phone number.');
      return;
    }
    if (form.deliveryType === 'delivery' && !form.address.trim()) {
      showAlert('Missing Address', 'Please enter a delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        customerName: form.name,
        customerPhone: form.phone,
        customerAddress: form.address || undefined,
        deliveryType: form.deliveryType,
        deliveryAddress: form.deliveryType === 'delivery' ? form.address : undefined,
        notes: form.notes || undefined,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency,
        })),
      };

      const res = await api.post(`/store/${companyId}/orders`, orderData);
      clearCompanyItems(companyId);

      navigation.replace('OrderConfirmation', {
        orderId: res.data.id,
        orderNumber: res.data.orderNumber || res.data.id.toString(),
      });
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Type */}
        <Text style={styles.sectionTitle}>Delivery Method</Text>
        <View style={styles.deliveryRow}>
          <TouchableOpacity
            style={[styles.deliveryOption, form.deliveryType === 'delivery' && styles.deliveryActive]}
            onPress={() => setForm({ ...form, deliveryType: 'delivery' })}
          >
            <Ionicons name="bicycle" size={20} color={form.deliveryType === 'delivery' ? colors.primary : colors.textMuted} />
            <Text style={[styles.deliveryText, form.deliveryType === 'delivery' && styles.deliveryTextActive]}>Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deliveryOption, form.deliveryType === 'pickup' && styles.deliveryActive]}
            onPress={() => setForm({ ...form, deliveryType: 'pickup' })}
          >
            <Ionicons name="storefront" size={20} color={form.deliveryType === 'pickup' ? colors.primary : colors.textMuted} />
            <Text style={[styles.deliveryText, form.deliveryType === 'pickup' && styles.deliveryTextActive]}>Pickup</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            placeholder="+961..."
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        {form.deliveryType === 'delivery' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Address *</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
              placeholder="Full delivery address"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.input}
            value={form.notes}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            placeholder="Any special instructions..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {cartItems.map((item) => (
            <View key={`${item.productId}-${item.unitType}`} style={styles.summaryRow}>
              <Text style={styles.summaryItem} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.summaryPrice}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryPrice}>${subtotal.toFixed(2)}</Text>
          </View>
          {form.deliveryType === 'delivery' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryPrice}>${deliveryFee.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Text style={styles.placeOrderTotal}>${total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  deliveryRow: { flexDirection: 'row', gap: spacing.md },
  deliveryOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  deliveryActive: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  deliveryText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  deliveryTextActive: { color: colors.primary, fontWeight: '600' },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { fontSize: fontSize.sm, color: colors.text, flex: 1, marginRight: spacing.md },
  summaryPrice: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  totalAmount: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: 32, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  placeOrderText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  placeOrderTotal: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
});
