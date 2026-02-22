import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import i18n, { setLanguage, t } from '../i18n';
import { useThemeStore } from '../stores/themeStore';
import type { ProfileStackParamList } from '../navigation/types';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, isGuest, logout } = useAuthStore();
  const [showLangModal, setShowLangModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const { mode: themeMode, toggle: toggleTheme } = useThemeStore();

  const handleLanguageChange = async (code: string) => {
    await setLanguage(code);
    setShowLangModal(false);
    forceUpdate((n) => n + 1);
  };

  const currentLang = languages.find((l) => l.code === i18n.locale) || languages[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myProfile')}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.textMuted} />
        </View>
        {isGuest ? (
          <View style={styles.guestInfo}>
            <Text style={styles.guestTitle}>Guest User</Text>
            <Text style={styles.guestSubtitle}>{t('signIn')} to track your orders</Text>
          </View>
        ) : (
          <View style={styles.guestInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
          </View>
        )}
      </View>

      {/* Auth Button */}
      {isGuest ? (
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="log-in-outline" size={20} color="#FFF" />
          <Text style={styles.authBtnText}>{t('signIn')} / {t('register')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutBtnText}>{t('signOut')}</Text>
        </TouchableOpacity>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <MenuItem icon="receipt-outline" label={t('myOrders')} onPress={() => navigation.navigate('OrderHistory')} />
        <MenuItem icon="heart-outline" label={t('favorites')} onPress={() => navigation.navigate('Favorites')} />
        <MenuItem icon="location-outline" label={t('savedAddresses')} onPress={() => navigation.navigate('SavedAddresses')} />
        <TouchableOpacity style={menuStyles.item} onPress={() => setShowLangModal(true)} activeOpacity={0.6}>
          <Ionicons name="language-outline" size={22} color={colors.textSecondary} />
          <Text style={menuStyles.label}>{t('language')}</Text>
          <Text style={menuStyles.langValue}>{currentLang.flag} {currentLang.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={menuStyles.item} onPress={toggleTheme} activeOpacity={0.6}>
          <Ionicons name={themeMode === 'dark' ? 'moon' : 'sunny-outline'} size={22} color={colors.textSecondary} />
          <Text style={menuStyles.label}>Dark Mode</Text>
          <Text style={menuStyles.langValue}>{themeMode === 'dark' ? 'On' : 'Off'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        <MenuItem icon="information-circle-outline" label="About" onPress={() => {}} />
      </View>

      {/* Language Picker Modal */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, i18n.locale === lang.code && styles.langOptionActive]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, i18n.locale === lang.code && styles.langLabelActive]}>{lang.label}</Text>
                {i18n.locale === lang.code && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={22} color={colors.textSecondary} />
      <Text style={menuStyles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  label: { flex: 1, fontSize: fontSize.md, color: colors.text },
  langValue: { fontSize: fontSize.sm, color: colors.textMuted, marginRight: spacing.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
    backgroundColor: colors.surface, marginBottom: spacing.sm,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.borderLight, justifyContent: 'center', alignItems: 'center',
  },
  guestInfo: {},
  guestTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  guestSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  userName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  userPhone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  authBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  authBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    backgroundColor: colors.surface, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error,
  },
  logoutBtnText: { color: colors.error, fontSize: fontSize.md, fontWeight: '600' },
  menuSection: {
    backgroundColor: colors.surface, marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, width: '80%', maxWidth: 320,
  },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '700', color: colors.text,
    marginBottom: spacing.lg, textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.xs,
  },
  langOptionActive: {
    backgroundColor: colors.primary + '15',
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: fontSize.md, color: colors.textSecondary },
  langLabelActive: { color: colors.primary, fontWeight: '600' },
});
