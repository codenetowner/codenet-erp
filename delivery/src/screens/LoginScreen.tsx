import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { driverApi } from '../api/driver';
import { companyApi } from '../api/companyApi';
import { useAuthStore } from '../stores/authStore';

type LoginMode = 'driver' | 'company';

export default function LoginScreen({ navigation }: any) {
  const [mode, setMode] = useState<LoginMode>('driver');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setCompanyAuth = useAuthStore((s) => s.setCompanyAuth);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      showAlert('Required', 'Enter phone and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'driver') {
        const res = await driverApi.login(phone.trim(), password);
        const data = res.data;
        if (data.status === 'pending') {
          showAlert('Pending Approval', 'Your account is awaiting admin approval.');
          return;
        }
        if (data.status === 'rejected') {
          showAlert('Rejected', data.reason || 'Your application was rejected.');
          return;
        }
        if (data.token) {
          setAuth(data.token, data.driver, data.status);
        }
      } else {
        const res = await companyApi.login(phone.trim(), password);
        const data = res.data;
        if (data.token) {
          setCompanyAuth(data.token, data.company);
        }
      }
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name={mode === 'driver' ? 'car' : 'business'} size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{mode === 'driver' ? 'Catalyst Driver' : 'Delivery Company'}</Text>
          <Text style={styles.subtitle}>{mode === 'driver' ? 'Deliver orders, earn money' : 'Manage your fleet'}</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'driver' && styles.modeBtnActive]}
            onPress={() => setMode('driver')}
          >
            <Ionicons name="car-outline" size={16} color={mode === 'driver' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'driver' && styles.modeTextActive]}>Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'company' && styles.modeBtnActive]}
            onPress={() => setMode('company')}
          >
            <Ionicons name="business-outline" size={16} color={mode === 'company' ? '#FFF' : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'company' && styles.modeTextActive]}>Company</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {mode === 'driver' && (
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Text style={styles.registerHighlight}>Register</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  form: {},
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text },
  loginBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md,
  },
  loginBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '700' },
  modeRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl,
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: borderRadius.sm,
  },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  modeTextActive: { color: '#FFF' },
  registerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  registerText: { color: colors.textSecondary, fontSize: fontSize.sm },
  registerHighlight: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
});
