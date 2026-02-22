import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

export default function FavoritesScreen() {
  const navigation = useNavigation<Nav>();
  const { isGuest } = useAuthStore();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {isGuest ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={56} color={colors.borderLight} />
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptySubtitle}>
            Create an account to save your favorite stores and products.
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={56} color={colors.borderLight} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtitle}>
            Browse stores and products, then tap the heart icon to save them here.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'Home' })}
          >
            <Ionicons name="storefront-outline" size={20} color="#FFF" />
            <Text style={styles.browseBtnText}>Browse Stores</Text>
          </TouchableOpacity>
        </View>
      )}
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
  emptySubtitle: {
    fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center',
    marginTop: spacing.xs, marginBottom: spacing.lg, paddingHorizontal: spacing.lg,
  },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  browseBtnText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
});
