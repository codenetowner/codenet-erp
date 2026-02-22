import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

interface Address {
  id: number;
  label?: string;
  address: string;
  city?: string;
  isDefault: boolean;
}

export default function SavedAddressesScreen() {
  const navigation = useNavigation<Nav>();
  const { isGuest } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ label: '', address: '', city: '', isDefault: false });

  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="location-outline" size={56} color={colors.borderLight} />
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptySubtitle}>
            Create an account to save your delivery addresses for faster checkout.
          </Text>
        </View>
      </View>
    );
  }

  const handleAdd = () => {
    if (!form.address.trim()) {
      Alert.alert('Required', 'Please enter an address.');
      return;
    }
    const newAddr: Address = {
      id: Date.now(),
      label: form.label || undefined,
      address: form.address,
      city: form.city || undefined,
      isDefault: form.isDefault,
    };
    if (form.isDefault) {
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: false })).concat(newAddr));
    } else {
      setAddresses((prev) => [...prev, newAddr]);
    }
    setForm({ label: '', address: '', city: '', isDefault: false });
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setAddresses((prev) => prev.filter((a) => a.id !== id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.backBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {addresses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={56} color={colors.borderLight} />
          <Text style={styles.emptyTitle}>No Saved Addresses</Text>
          <Text style={styles.emptySubtitle}>Add an address for faster checkout.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addrCard}>
              <View style={styles.addrRow}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  {addr.label && (
                    <View style={styles.labelRow}>
                      <Text style={styles.labelText}>{addr.label}</Text>
                      {addr.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={styles.addrText}>{addr.address}</Text>
                  {addr.city && <Text style={styles.cityText}>{addr.city}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(addr.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Address Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Address</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label</Text>
              <TextInput
                style={styles.input}
                value={form.label}
                onChangeText={(v) => setForm({ ...form, label: v })}
                placeholder="Home, Work, etc."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                placeholder="Full delivery address"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(v) => setForm({ ...form, city: v })}
                placeholder="City"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
            >
              <Ionicons
                name={form.isDefault ? 'checkbox' : 'square-outline'}
                size={22}
                color={form.isDefault ? colors.primary : colors.textMuted}
              />
              <Text style={styles.defaultToggleText}>Set as default address</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  list: { padding: spacing.lg, paddingBottom: 40 },
  addrCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  labelText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  defaultBadge: {
    backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  defaultText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  addrText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  cityText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.text,
  },
  defaultToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  defaultToggleText: { fontSize: fontSize.sm, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
