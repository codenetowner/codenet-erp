import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemUnit}>{item.unitType}</Text>
        <Text style={styles.itemPrice}>{item.currency} {item.unitPrice.toFixed(2)}</Text>
      </View>
      <View style={styles.qtyCol}>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.productId, item.unitType, item.quantity - 1)}
          >
            <Ionicons name="remove" size={14} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.productId, item.unitType, item.quantity + 1)}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.lineTotal}>
          {item.currency} {(item.unitPrice * item.quantity).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearBtn}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Browse stores and add products</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={groups}
            keyExtractor={(item) => item.companyId.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item: group }) => (
              <View style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Ionicons name="storefront-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.groupTitle}>Store #{group.companyId}</Text>
                  <TouchableOpacity onPress={() => clearCompanyItems(group.companyId)}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
                {group.items.map((item) => (
                  <View key={`${item.productId}-${item.unitType}`}>
                    {renderItem({ item })}
                  </View>
                ))}
                <View style={styles.groupFooter}>
                  <Text style={styles.groupTotal}>Subtotal: ${group.total.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={() => navigation.navigate('Checkout', { companyId: group.companyId })}
                  >
                    <Text style={styles.checkoutBtnText}>Checkout</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>Total ({items.reduce((s, i) => s + i.quantity, 0)} items)</Text>
            <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  clearBtn: { fontSize: fontSize.sm, color: colors.error, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing.lg },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  list: { padding: spacing.lg, paddingBottom: 100 },
  groupCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.borderLight,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  groupTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  itemImage: { width: 48, height: 48, borderRadius: borderRadius.sm },
  itemImagePlaceholder: { backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  itemUnit: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  itemPrice: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  qtyCol: { alignItems: 'flex-end' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, minWidth: 18, textAlign: 'center' },
  lineTotal: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary, marginTop: 4 },
  groupFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
  },
  groupTotal: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  checkoutBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: 32,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  totalAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
});
