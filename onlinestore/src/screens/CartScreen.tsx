import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert, ScrollView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useCartStore } from '../stores/cartStore';
import type { CartItem } from '../stores/cartStore';
import type { CartStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CartStackParamList>;

interface CompanyGroup {
  companyId: number;
  items: CartItem[];
  total: number;
}

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearCompanyItems = useCartStore((s) => s.clearCompanyItems);

  // Group items by company
  const groups: CompanyGroup[] = [];
  items.forEach((item) => {
    let group = groups.find((g) => g.companyId === item.companyId);
    if (!group) {
      group = { companyId: item.companyId, items: [], total: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.total += item.unitPrice * item.quantity;
  });

  const grandTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleClearAll = () => {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
    ]);
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const deliveryFee = 2.99;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.cartIconBox}>
            <Ionicons name="bag" size={20} color="#FFF" />
            {totalItems > 0 && (
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{totalItems}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>Magical Cart</Text>
            <Text style={styles.headerSubtitle}>{totalItems} items ready</Text>
          </View>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Time to discover something amazing!</Text>
          <TouchableOpacity style={styles.emptyBtn}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.emptyBtnGradient}>
              <Ionicons name="compass" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Explore Stores</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Cart Items */}
          {groups.map((group) => (
            <View key={group.companyId} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.storeBadge}>
                  <Ionicons name="storefront" size={14} color="#6366F1" />
                </View>
                <Text style={styles.groupTitle}>Store #{group.companyId}</Text>
                <TouchableOpacity onPress={() => clearCompanyItems(group.companyId)} style={styles.trashBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
              
              {group.items.map((item) => (
                <View key={`${item.productId}-${item.unitType}`} style={styles.itemCard}>
                  <View style={styles.itemImageContainer}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemUnit}>{item.unitType}</Text>
                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPrice}>${item.unitPrice.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.qtyCol}>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.unitType, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.unitType, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.lineTotalBox}>
                      <Text style={styles.lineTotalLabel}>Total</Text>
                      <Text style={styles.lineTotal}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => navigation.navigate('Checkout', { companyId: group.companyId })}
              >
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.checkoutBtnGradient}>
                  <Text style={styles.checkoutBtnText}>Checkout Store</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))}

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="receipt" size={20} color="#6366F1" />
              <Text style={styles.summaryTitle}>Order Summary</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
              <Text style={styles.summaryValue}>${grandTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGreen}>Discount</Text>
              <Text style={styles.summaryValueGreen}>-$0.00</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <View style={styles.summaryTotalBox}>
                <Text style={styles.summaryTotalValue}>${(grandTotal + deliveryFee).toFixed(2)}</Text>
                <Text style={styles.summaryTotalNote}>Including Taxes</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cartIconBox: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  cartCountBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#F43F5E', minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
  },
  cartCountText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  clearBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 30, backgroundColor: colors.borderLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: colors.textMuted, marginBottom: 32, textAlign: 'center' },
  emptyBtn: { borderRadius: 16, overflow: 'hidden' },
  emptyBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 28, paddingVertical: 16,
  },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  scrollContent: { padding: 16 },
  
  groupCard: {
    backgroundColor: colors.surface, borderRadius: 24,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  storeBadge: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  groupTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  trashBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  
  itemCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  itemImageContainer: {
    width: 70, height: 70, borderRadius: 16, backgroundColor: colors.borderLight,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  itemUnit: { fontSize: 11, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },
  itemPriceRow: { marginTop: 6 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#6366F1' },
  
  qtyCol: { alignItems: 'flex-end', gap: 12 },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.borderLight, borderRadius: 12, padding: 4,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  qtyText: { fontSize: 14, fontWeight: '800', color: colors.text, minWidth: 24, textAlign: 'center' },
  lineTotalBox: { alignItems: 'flex-end' },
  lineTotalLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 2 },
  lineTotal: { fontSize: 15, fontWeight: '800', color: '#6366F1' },

  checkoutBtn: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  checkoutBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16,
  },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryLabelGreen: { fontSize: 14, color: '#10B981', fontWeight: '500' },
  summaryValueGreen: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  summaryTotalBox: { alignItems: 'flex-end' },
  summaryTotalValue: { fontSize: 28, fontWeight: '800', color: '#6366F1' },
  summaryTotalNote: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
});
