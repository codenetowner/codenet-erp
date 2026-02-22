import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { companyApi } from '../api/companyApi';

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
  else Alert.alert(title, msg);
};

export default function CompanyDriversScreen() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', password: '', vehicleType: 'car', vehiclePlate: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await companyApi.getDrivers();
      setDrivers(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim() || !addForm.password.trim()) {
      showAlert('Required', 'Name, phone, and password are required.');
      return;
    }
    setAdding(true);
    try {
      await companyApi.addDriver(addForm);
      setShowAddModal(false);
      setAddForm({ name: '', phone: '', password: '', vehicleType: 'car', vehiclePlate: '' });
      load();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to add driver.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await companyApi.toggleDriverStatus(id);
      load();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleRemove = async (id: number, name: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Remove ${name} from your company?`)
      : true; // On native, use Alert with callback
    if (!confirmed) return;
    try {
      await companyApi.removeDriver(id);
      load();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to remove driver.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Drivers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Driver</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(d) => d.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No drivers yet</Text>
            <Text style={styles.emptySubtext}>Add drivers to start managing your fleet</Text>
          </View>
        }
        renderItem={({ item: d }) => (
          <View style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={[styles.avatar, { backgroundColor: d.isOnline ? '#10B98130' : colors.border }]}>
                <Ionicons name="person" size={20} color={d.isOnline ? '#10B981' : colors.textMuted} />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{d.name}</Text>
                <Text style={styles.driverPhone}>{d.phone}</Text>
                <View style={styles.driverMeta}>
                  <View style={[styles.badge, d.status === 'approved' ? styles.badgeGreen : styles.badgeRed]}>
                    <Text style={[styles.badgeText, d.status === 'approved' ? styles.badgeTextGreen : styles.badgeTextRed]}>
                      {d.status}
                    </Text>
                  </View>
                  {d.isOnline && (
                    <View style={[styles.badge, styles.badgeGreen]}>
                      <Text style={[styles.badgeText, styles.badgeTextGreen]}>Online</Text>
                    </View>
                  )}
                  <Text style={styles.metaText}>{d.vehicleType}</Text>
                </View>
              </View>
              <View style={styles.driverStats}>
                <Text style={styles.statValue}>{d.totalDeliveries}</Text>
                <Text style={styles.statLabel}>deliveries</Text>
                <Text style={styles.statValue}>${(d.totalEarnings ?? 0).toFixed(0)}</Text>
                <Text style={styles.statLabel}>earned</Text>
              </View>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(d.id)}>
                <Ionicons name={d.status === 'approved' ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={colors.primary} />
                <Text style={styles.actionText}>{d.status === 'approved' ? 'Suspend' : 'Activate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(d.id, d.name)}>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add Driver Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add New Driver</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={addForm.name}
                onChangeText={(v) => setAddForm({ ...addForm, name: v })}
                placeholder="Driver name" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={addForm.phone}
                onChangeText={(v) => setAddForm({ ...addForm, phone: v })}
                placeholder="Phone number" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} value={addForm.password}
                onChangeText={(v) => setAddForm({ ...addForm, password: v })}
                placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Type</Text>
              <TextInput style={styles.input} value={addForm.vehicleType}
                onChangeText={(v) => setAddForm({ ...addForm, vehicleType: v })}
                placeholder="car, motorcycle, bicycle" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Plate</Text>
              <TextInput style={styles.input} value={addForm.vehiclePlate}
                onChangeText={(v) => setAddForm({ ...addForm, vehiclePlate: v })}
                placeholder="Plate number" placeholderTextColor={colors.textMuted} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={adding}>
                {adding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Add Driver</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addBtnText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  list: { padding: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  emptySubtext: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  driverCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  driverPhone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#10B98120' },
  badgeRed: { backgroundColor: '#EF444420' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  badgeTextGreen: { color: '#10B981' },
  badgeTextRed: { color: '#EF4444' },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  driverStats: { alignItems: 'flex-end' },
  statValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted },
  driverActions: {
    flexDirection: 'row', gap: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: spacing.md, paddingTop: spacing.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, width: '90%', maxWidth: 400,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.text,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  submitBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  submitBtnText: { color: '#FFF', fontWeight: '600' },
});
