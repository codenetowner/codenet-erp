import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { driverApi } from '../api/driver';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '',
    vehicleType: 'car', vehiclePlate: '', vehicleColor: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.password) {
      Alert.alert('Required', 'Name, phone, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await driverApi.register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate.trim() || undefined,
        vehicleColor: form.vehicleColor.trim() || undefined,
      });
      if (Platform.OS === 'web') {
        window.alert('Registration Submitted: Your application is pending admin approval. You will be able to sign in once approved.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Registration Submitted',
          'Your application is pending admin approval. You will be able to sign in once approved.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const vehicles = [
    { key: 'motorcycle', icon: 'bicycle', label: 'Motorcycle' },
    { key: 'car', icon: 'car', label: 'Car' },
    { key: 'van', icon: 'bus', label: 'Van' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Register as Driver</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        <InputField label="Full Name *" icon="person-outline" value={form.name}
          onChange={(v: string) => setForm({ ...form, name: v })} />
        <InputField label="Phone Number *" icon="call-outline" value={form.phone}
          onChange={(v: string) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
        <InputField label="Email" icon="mail-outline" value={form.email}
          onChange={(v: string) => setForm({ ...form, email: v })} keyboardType="email-address" />
        <InputField label="Password *" icon="lock-closed-outline" value={form.password}
          onChange={(v: string) => setForm({ ...form, password: v })} secure />
        <InputField label="Confirm Password *" icon="lock-closed-outline" value={form.confirmPassword}
          onChange={(v: string) => setForm({ ...form, confirmPassword: v })} secure />

        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <View style={styles.vehicleRow}>
          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.key}
              style={[styles.vehicleBtn, form.vehicleType === v.key && styles.vehicleBtnActive]}
              onPress={() => setForm({ ...form, vehicleType: v.key })}
            >
              <Ionicons name={v.icon as any} size={22}
                color={form.vehicleType === v.key ? colors.primary : colors.textMuted} />
              <Text style={[styles.vehicleLabel,
                form.vehicleType === v.key && { color: colors.primary }]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <InputField label="License Plate" icon="card-outline" value={form.vehiclePlate}
          onChange={(v: string) => setForm({ ...form, vehiclePlate: v })} />
        <InputField label="Vehicle Color" icon="color-palette-outline" value={form.vehicleColor}
          onChange={(v: string) => setForm({ ...form, vehicleColor: v })} />

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, icon, value, onChange, secure, keyboardType }: any) {
  return (
    <View style={fStyles.group}>
      <Text style={fStyles.label}>{label}</Text>
      <View style={fStyles.row}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <TextInput
          style={fStyles.input}
          value={value}
          onChangeText={onChange}
          placeholder={label.replace(' *', '')}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 56 },
  backBtn: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  vehicleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  vehicleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  vehicleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  vehicleLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  submitBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: 40,
  },
  submitBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
});
